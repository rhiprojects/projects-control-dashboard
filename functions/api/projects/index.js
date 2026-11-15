import {handler,identity,rest,projectFields,toProject,json,HttpError,code} from '../../_lib/core.js';
export function onRequestGet({request,env}){return handler(async()=>{
 const user=await identity(request,env);
 const rows=await rest(env,`ongoing_projects?select=${projectFields}&order=project_code.asc`,{token:user.token});
 return json({projects:(rows||[]).map(toProject),role:user.role});
})}
const validDate=v=>v==null||typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v));
export function onRequestPost({request,env}){return handler(async()=>{
 const user=await identity(request,env);
 let body;try{body=await request.json()}catch{throw new HttpError(400,'Invalid project form')}
 const projectCode=code(String(body.projectCode||''));
 const client=String(body.client||'').trim(),scope=String(body.scope||'').trim();
 const currency=String(body.currency||'EGP');
 const amount=body.contractValue===null||body.contractValue===undefined||body.contractValue===''?NaN:Number(body.contractValue);
 const progress=body.progress===null||body.progress===undefined||body.progress===''?null:Number(body.progress);
 if(!client||client.length>400||!scope||scope.length>2000||!['EGP','USD','EUR','Other'].includes(currency)||
 !Number.isFinite(amount)||amount<0||amount>1e15||(progress!==null&&(!Number.isFinite(progress)||progress<0||progress>100)))throw new HttpError(400,'Please check the project information');
 if(!validDate(body.startDate)||!validDate(body.baselineFinish)||!validDate(body.forecastFinish))
  throw new HttpError(400,'Invalid project date');
 const duration=body.durationMonths==null||body.durationMonths===''?null:Number(body.durationMonths);
 if(duration!==null&&(!Number.isInteger(duration)||duration<1||duration>600))throw new HttpError(400,'Invalid duration');
 const payload={project_code:projectCode,client,scope,currency,contract_amount:amount,status:'Active',
  created_by:user.profileId,portal_visible:true,physical_progress_pct:progress,source_file:'Portal project creation',
  planned_start_date:body.startDate||null,planned_finish_date:body.baselineFinish||null,
  forecast_finish_date:body.forecastFinish||null,duration_months:duration,
  location:String(body.location||'').slice(0,300)||null,
  internal_owner_id:null};
 const rows=await rest(env,`ongoing_projects?select=${projectFields}`,{token:user.token,method:'POST',body:payload});
 if(!rows?.length)throw new HttpError(409,'Project could not be saved');
 return json({project:toProject(rows[0])},201);
})}
