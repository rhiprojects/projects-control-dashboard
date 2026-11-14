/* Server-only API helpers. Supabase RLS enforces project access; never use a service-role key here. */
export const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store, max-age=0','x-content-type-options':'nosniff'}});
export class HttpError extends Error{constructor(status,message){super(message);this.status=status}}
export const handler=async fn=>{try{return await fn()}catch(err){return json({error:err instanceof HttpError?err.message:'Database service unavailable'},err instanceof HttpError?err.status:503)}};
const setting=(env,k)=>{if(!env[k])throw new HttpError(503,'Supabase configuration incomplete');return String(env[k])};
const base=env=>setting(env,'SUPABASE_URL').replace(/\/+$/,'');
async function upstream(url,opts){let res;try{res=await fetch(url,{...opts,redirect:'manual'})}catch{throw new HttpError(502,'Supabase is unreachable')};if(res.status>=300&&res.status<400)throw new HttpError(502,'Unexpected Supabase redirect');let result;try{result=await res.json()}catch{result=null};return {res,result}}
export async function rest(env,path,{token,method='GET',body,prefer='return=representation'}={}){
 if(!token)throw new HttpError(401,'Sign in required');
 const {res,result}=await upstream(`${base(env)}/rest/v1/${path}`,{method,headers:{apikey:setting(env,'SUPABASE_PUBLISHABLE_KEY'),authorization:`Bearer ${token}`,'content-type':'application/json',prefer},body:body===undefined?undefined:JSON.stringify(body)});
 if(!res.ok)throw new HttpError(res.status===401?401:res.status===403?403:502,'Project request failed');
 return result;
}
export async function identity(request,env){
 const match=/^Bearer ([A-Za-z0-9._-]+)$/.exec(request.headers.get('authorization')||'');
 if(!match||match[1].length>8192)throw new HttpError(401,'Sign in required');
 const token=match[1];const key=setting(env,'SUPABASE_PUBLISHABLE_KEY');
 const {res,result:user}=await upstream(`${base(env)}/auth/v1/user`,{headers:{apikey:key,authorization:`Bearer ${token}`}});
 if(!res.ok||!user?.id||!user?.email||!user?.email_confirmed_at)throw new HttpError(401,'Invalid or unverified login');
 const query=`project_users?select=id,display_name,role,active,email&auth_user_id=eq.${encodeURIComponent(user.id)}&limit=1`;
 const rows=await rest(env,query,{token});const profile=rows?.[0];
 if(!profile||!profile.active||String(profile.email).toLowerCase()!==String(user.email).toLowerCase())throw new HttpError(403,'Account not enabled for Projects Control');
 if(!['super_admin','head_of_projects','team_member'].includes(profile.role))throw new HttpError(403,'Invalid account role');
 return {token,profileId:profile.id,name:profile.display_name,role:profile.role};
}
export const adminOnly=session=>{if(session.role!=='super_admin')throw new HttpError(403,'Super Admin only')};
export function code(value){if(typeof value!=='string'||!/^\d{2,5}(?:\.\d{1,3})?$/.test(value))throw new HttpError(400,'Invalid project code');return value}
export function toProject(r){const title=r.project_code==='776'?'Slag Mill KSA (RICG)':(r.scope||r.client);return {id:r.project_code,name:`${r.project_code} — ${r.client} — ${title}`,projectTitle:title,client:r.client,scope:r.scope,contractCurrency:r.currency,contractValue:r.contract_amount===null?null:Number(r.contract_amount),status:r.status,progress:r.physical_progress_pct===null?null:Number(r.physical_progress_pct),notes:r.source_notes??'',sourceTotalProgress:r.source_total_progress===null?null:Number(r.source_total_progress),sourceRemaining:r.source_remaining_contract===null?null:Number(r.source_remaining_contract),createdBy:r.created_by??null,internalOwnerId:r.internal_owner_id??null,location:r.location??null,plannedStart:r.planned_start_date??null,plannedFinish:r.planned_finish_date??null,forecastFinish:r.forecast_finish_date??null,durationMonths:r.duration_months??null,lastEdited:r.last_updated,startDate:r.planned_start_date??null,baselineFinish:r.planned_finish_date??null,variations:null,costToComplete:null};}
export const projectFields='project_code,client,scope,currency,contract_amount,status,physical_progress_pct,source_notes,source_total_progress,source_remaining_contract,last_updated,created_by,internal_owner_id,location,planned_start_date,planned_finish_date,forecast_finish_date,duration_months';
export async function getProject(env,session,pcode){
 const rows=await rest(env,`ongoing_projects?project_code=eq.${encodeURIComponent(code(pcode))}&select=${projectFields}&limit=1`,{token:session.token});
 if(!rows?.length)throw new HttpError(404,'Project not available to your account');return rows[0];
}
const number=(v,k,max)=>{if(v===null)return null;if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max)throw new HttpError(400,`Invalid ${k}`);return v};
export function checkedChanges(changes){if(!changes||typeof changes!=='object'||Array.isArray(changes))throw new HttpError(400,'Invalid changes');const keys=Object.keys(changes);if(!keys.length||keys.length>8||keys.some(k=>!['contractValue','progress','status','durationMonths','forecastFinish','plannedStart','plannedFinish','location','notes'].includes(k)))throw new HttpError(400,'Field not editable');const dateValue=v=>{if(v===null||v==='')return null;if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw new HttpError(400,'Invalid date');return v};const out={};for(const key of keys){const v=changes[key];if(key==='contractValue'||key==='progress'){if(v!==null&&(typeof v!=='number'||!Number.isFinite(v)||v<0||v>(key==='progress'?100:1e15)))throw new HttpError(400,'Invalid '+key);out[key==='contractValue'?'contract_amount':'physical_progress_pct']=v;}else if(key==='status'){if(!['Active','On Hold','Completed','Cancelled'].includes(v))throw new HttpError(400,'Invalid status');out.status=v;}else if(key==='durationMonths'){if(!Number.isInteger(v)||v<1||v>600)throw new HttpError(400,'Invalid duration');out.duration_months=v;}else if(key==='location'||key==='notes'){if(typeof v!=='string'||v.length>(key==='location'?300:6000))throw new HttpError(400,'Invalid text');out[key==='location'?'location':'source_notes']=v.trim();}else out[key==='forecastFinish'?'forecast_finish_date':key==='plannedStart'?'planned_start_date':'planned_finish_date']=dateValue(v);}return out;}
