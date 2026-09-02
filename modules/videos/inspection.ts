import { MAX_VIDEO_DURATION_SECONDS, MAX_VIDEO_FILE_SIZE_BYTES } from './schemas'
import type { VideoMimeType } from './types'

export function inspectVideo(bytes: Uint8Array): {mimeType:VideoMimeType;durationSeconds:number} {
  if (!bytes.length || bytes.length>MAX_VIDEO_FILE_SIZE_BYTES) throw new Error('invalid video size')
  const mp4=inspectMp4(bytes); if(mp4) return {mimeType:'video/mp4',durationSeconds:validateDuration(mp4)}
  const webm=inspectWebm(bytes); if(webm) return {mimeType:'video/webm',durationSeconds:validateDuration(webm)}
  throw new Error('unsupported or malformed video container')
}
function validateDuration(value:number){if(!Number.isFinite(value)||value<=0||value>MAX_VIDEO_DURATION_SECONDS+.05)throw new Error('video duration exceeds 30 seconds');return Math.round(value*1000)/1000}
function inspectMp4(b:Uint8Array):number|null{
  if(b.length<16||String.fromCharCode(...b.slice(4,8))!=='ftyp')return null
  const v=new DataView(b.buffer,b.byteOffset,b.byteLength);let p=0
  while(p+8<=b.length){let size=v.getUint32(p);const type=String.fromCharCode(...b.slice(p+4,p+8));if(size===1){if(p+16>b.length)return null;size=Number(v.getBigUint64(p+8))}if(size<8||p+size>b.length)return null
    if(type==='moov'){let q=p+8;while(q+8<=p+size){const s=v.getUint32(q),t=String.fromCharCode(...b.slice(q+4,q+8));if(s<8||q+s>p+size)break;if(t==='mvhd'){const ver=b[q+8];const o=q+12+(ver===1?16:8);const scale=v.getUint32(o),dur=ver===1?Number(v.getBigUint64(o+4)):v.getUint32(o+4);return scale?dur/scale:null}q+=s}}
    p+=size
  }return null
}
function vint(b:Uint8Array,p:number){const first=b[p];if(first===undefined||first===0)return null;let n=1,mask=0x80;while(!(first&mask)&&n<=8){n++;mask>>=1}if(p+n>b.length)return null;let value=first&(mask-1);for(let i=1;i<n;i++)value=value*256+b[p+i];return {value,length:n}}
function inspectWebm(b:Uint8Array):number|null{
  if(b.length<4||b[0]!==0x1a||b[1]!==0x45||b[2]!==0xdf||b[3]!==0xa3)return null
  let scale=1_000_000,duration:number|null=null
  for(let p=4;p<b.length-4;p++){
    if(b[p]===0x2a&&b[p+1]===0xd7&&b[p+2]===0xb1){const s=vint(b,p+3);if(s&&s.value<=8){let x=0;for(let i=0;i<s.value;i++)x=x*256+b[p+3+s.length+i];scale=x}}
    if(b[p]===0x44&&b[p+1]===0x89){const s=vint(b,p+2);if(s&&(s.value===4||s.value===8)){const v=new DataView(b.buffer,b.byteOffset+p+2+s.length,s.value);duration=s.value===4?v.getFloat32(0):v.getFloat64(0)}}
  }return duration===null?null:duration*scale/1e9
}
export function inspectPoster(bytes:Uint8Array){const jpg=bytes.length>3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes.at(-2)===0xff&&bytes.at(-1)===0xd9;const webp=bytes.length>12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';if(!jpg&&!webp)throw new Error('invalid poster image')}

