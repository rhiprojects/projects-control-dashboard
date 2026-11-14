import {handler,identity,rest,projectFields,toProject,json,HttpError,code} from '../../_lib/core.js';
export function onRequestGet({request,env}){return handler(async()=>{const user=await identity(request,env);const rows=await rest(env,`ongoing_projects?select=${projectFields}&order=project_code.asc`,{token:user.token});return json({projects:(rows||[]).map(toProject),source:'supabase',role:user.role})})}

export function onRequestPost({request,env}){return handler(()=>createProject(request,env))}
async function createProject(request,env){
 const user=await identity(request,env);
 let b;try{b=await request.json()}catch{throw new HttpError(400,'Invalid project form')}
 const c=code(String(b?.projectCode||'').trim());
 const clean=(v,max)=>typeof v==='string'&&v.trim().length>=2&&v.trim().length<=max?v.trim():null;
 const client=clean(b?.client,160),scope=clean(b?.scope,300);
 if(!client||!scope)throw new HttpError(400,'Enter a client and project name');
 if(!['EGP','USD','EUR','Other'].includes(b.currency))throw new HttpError(400,'Choose a currency');
 const amount=Number(b.contractValue);
 if(b.contractValue===null||b.contractValue===undefined||b.contractValue===''||!Number.isFinite(amount)||amount<0||amount>1e15)throw new HttpError(400,'Enter the contract amount');
 const dates={planned_start_date:b.plannedStart||null,planned_finish_date:b.plannedFinish||null,forecast_finish_date:b.forecastFinish||null};
 for(const v of Object.values(dates))if(v!==null&&(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v).toISOString().slice(0,10)!==v))throw new HttpError(400,'Invalid project date');
 const months=b.durationMonths===null||b.durationMonths===undefined||b.durationMonths===''?null:Number(b.durationMonths);
 if(months!==null&&(!Number.isInteger(months)||months<1||months>600))throw new HttpError(400,'Invalid project duration');
 const row={project_code:c,client,scope,currency:b.currency,contract_amount:amount,status:'Active',source_file:'Created in Projects Control',source_notes:'',portal_visible:true,created_by:user.profileId,location:typeof b.location==='string'?b.location.trim().slice(0,300):null,duration_months:months,...dates};
 const inserted=await rest(env,`ongoing_projects?select=${projectFields}`,{token:user.token,method:'POST',body:row});
 if(!inserted||inserted.length!==1)throw new HttpError(409,'Could not create the project');
 return json({project:toProject(inserted[0])},201);
}
