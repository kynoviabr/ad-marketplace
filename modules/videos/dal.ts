import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ManageableProfileVideo, ProfileVideo } from './types'
export async function getProfileVideos(profileId:string){const {data}=await createAdminClient().from('profile_videos').select('*').eq('profile_id',profileId).is('deleted_at',null).order('position');return (data??[]) as ProfileVideo[]}
export async function getVideoById(id:string){const {data}=await createAdminClient().from('profile_videos').select('*').eq('id',id).maybeSingle();return data as ProfileVideo|null}
export async function getManageableProfileVideos(profileId:string):Promise<ManageableProfileVideo[]>{const admin=createAdminClient();return Promise.all((await getProfileVideos(profileId)).map(async v=>{const {data}=await admin.storage.from('profile-videos').createSignedUrl(v.poster_storage_path,900);return {...v,posterUrl:data?.signedUrl??null}}))}
export async function getApprovedVideoPosterDeliveryUrl(path:string){const {data,error}=await createAdminClient().storage.from('profile-videos').createSignedUrl(path,3600);return error?null:data?.signedUrl??null}
export async function getApprovedPublicVideos(profileId:string){const admin=createAdminClient();const {data}=await admin.from('profile_videos').select('*').eq('profile_id',profileId).eq('status','APPROVED').is('deleted_at',null).order('position');return Promise.all(((data??[]) as ProfileVideo[]).map(async v=>({id:v.id,posterUrl:await getApprovedVideoPosterDeliveryUrl(v.poster_storage_path),durationSeconds:v.duration_seconds})))}
