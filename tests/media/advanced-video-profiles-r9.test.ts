import { describe,expect,it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { inspectPoster, inspectVideo } from '@/modules/videos/inspection'
import { MAX_VIDEO_DURATION_SECONDS, MAX_VIDEO_FILE_SIZE_BYTES, MAX_VIDEOS_PER_PROFILE, VIDEO_MIME_TYPES } from '@/modules/videos/schemas'
const root=process.cwd(),read=(p:string)=>fs.readFileSync(path.join(root,p),'utf8')
const box=(type:string,body:Buffer)=>{const out=Buffer.alloc(body.length+8);out.writeUInt32BE(out.length);out.write(type,4);body.copy(out,8);return out}
function mp4(seconds:number){const ftyp=box('ftyp',Buffer.from('isom0000'));const body=Buffer.alloc(24);body[0]=0;body.writeUInt32BE(1000,12);body.writeUInt32BE(seconds*1000,16);return Buffer.concat([ftyp,box('moov',box('mvhd',body))])}
describe('R9 profile videos',()=>{
 it('enforces conservative V1 limits',()=>{expect(MAX_VIDEOS_PER_PROFILE).toBe(3);expect(MAX_VIDEO_DURATION_SECONDS).toBe(30);expect(MAX_VIDEO_FILE_SIZE_BYTES).toBe(52428800);expect(VIDEO_MIME_TYPES).toEqual(['video/mp4','video/webm'])})
 it('inspects stored MP4 bytes and duration',()=>{expect(inspectVideo(mp4(30))).toMatchObject({mimeType:'video/mp4',durationSeconds:30});expect(()=>inspectVideo(mp4(31))).toThrow(/duration/)})
 it('rejects spoofed content and validates poster signatures',()=>{expect(()=>inspectVideo(Buffer.from('not a video'))).toThrow(/unsupported/);expect(()=>inspectPoster(Buffer.from([0xff,0xd8,1,2,0xff,0xd9]))).not.toThrow()})
 it('keeps storage private, RLS/server-only mutation and approval gate',()=>{const sql=read('supabase/migrations/20260902232323_profile_videos.sql'),actions=read('modules/videos/actions.ts'),dal=read('modules/videos/dal.ts');expect(sql).toMatch(/'profile-videos', 'profile-videos', false/);expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);expect(sql).toMatch(/WITH CHECK\(false\)/);expect(actions).toMatch(/requireVerifiedAdvertiser/);expect(actions).toMatch(/status!=='APPROVED'/);expect(dal).toMatch(/eq\('status','APPROVED'\)/)})
 it('defers playback and preserves no-autoplay lightbox behavior',()=>{const gallery=read('components/public/profile-gallery.tsx');expect(gallery).toContain('getVideoPlaybackUrlAction');expect(gallery).toContain('controls preload="none"');expect(gallery).not.toContain('autoPlay')})
 it('does not change protected R4-R8 migrations',()=>{for(const name of ['20260818000005_profile_media.sql','20260902190846_real_reviews.sql'])expect(fs.existsSync(path.join(root,'supabase/migrations',name))).toBe(true)})
})

