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
export function toProject(r){return {
 id:r.project_code, name:r.project_code+' — '+(r.project_code==='776'?'Slag Mill KSA (RICG)':r.client)+' — '+r.scope,displayName:r.project_code==='776'?'Slag Mill KSA (RICG)':r.client,client:r.client,scope:r.scope,
 contractCurrency:r.currency,contractValue:r.contract_amount===null?null:Number(r.contract_amount),
 status:r.status,progress:r.physical_progress_pct===null?null:Number(r.physical_progress_pct),notes:r.source_notes??'',
 sourceTotalProgress:r.source_total_progress===null?null:Number(r.source_total_progress),
 sourceRemaining:r.source_remaining_contract===null?null:Number(r.source_remaining_contract),
 lastEdited:r.last_updated,startDate:r.planned_start_date||null,baselineFinish:r.planned_finish_date||null,
 forecastFinish:r.forecast_finish_date||null,durationMonths:r.duration_months??null,
 internalOwnerId:r.internal_owner_id||null,createdBy:r.created_by||null,location:r.location||null
}};
export const projectFields='project_code,client,scope,currency,contract_amount,status,physical_progress_pct,source_notes,source_total_progress,source_remaining_contract,last_updated,planned_start_date,planned_finish_date,forecast_finish_date,duration_months,internal_owner_id,created_by,location';
export async function getProject(env,session,pcode){
 const rows=await rest(env,`ongoing_projects?project_code=eq.${encodeURIComponent(code(pcode))}&select=${projectFields}&limit=1`,{token:session.token});
 if(!rows?.length)throw new HttpError(404,'Project not available to your account');return rows[0];
}
const number=(v,k,max)=>{if(v===null)return null;if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max)throw new HttpError(400,`Invalid ${k}`);return v};
export function checkedChanges(changes){
 if(!changes||typeof changes!=='object'||Array.isArray(changes))throw new HttpError(400,'Invalid changes');
 const mapping={contractValue:'contract_amount',progress:'physical_progress_pct',status:'status',
   client:'client',scope:'scope',location:'location',startDate:'planned_start_date',
   baselineFinish:'planned_finish_date',forecastFinish:'forecast_finish_date',
   durationMonths:'duration_months',internalOwnerId:'internal_owner_id'};
 const entries=Object.entries(changes);
 if(!entries.length||entries.length>Object.keys(mapping).length||entries.some(([k])=>!mapping[k]))throw new HttpError(400,'Invalid project fields');
 const out={};
 for(const [k,v] of entries){
  if(k==='contractValue'||k==='progress')out[mapping[k]]=number(v,k,k==='progress'?100:1e15);
  else if(k==='status'){if(!['Active','On Hold','Completed','Cancelled'].includes(v))throw new HttpError(400,'Invalid status');out.status=v;}
  else if(k==='durationMonths'){if(v!==null&&(!Number.isInteger(v)||v<1||v>1200))throw new HttpError(400,'Invalid duration');out.duration_months=v;}
  else if(k==='internalOwnerId'){if(v!==null&&(typeof v!=='string'||!/^[-a-f0-9]{36}$/i.test(v)))throw new HttpError(400,'Invalid owner');out.internal_owner_id=v;}
  else if(['startDate','baselineFinish','forecastFinish'].includes(k)){
   if(v!==null&&(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))))throw new HttpError(400,'Invalid date');
   out[mapping[k]]=v;
  }else{if(v!==null&&(typeof v!=='string'||v.length>2000))throw new HttpError(400,'Invalid text field');out[mapping[k]]=v;}
 }
 return out;
}
