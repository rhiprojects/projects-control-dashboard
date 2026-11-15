import {handler,identity,getProject,checkedChanges,rest,toProject,json,HttpError,code,projectFields} from '../../_lib/core.js';
export function onRequestPut({request,env,params}){return handler(async()=>{
 const user=await identity(request,env);const projectCode=code(String(params.code||''));
 const old=await getProject(env,user,projectCode);
 let body;try{body=await request.json()}catch{throw new HttpError(400,'Invalid JSON')}
 if(typeof body?.lastEdited!=='string'||body.lastEdited!==old.last_updated)throw new HttpError(409,'Project was updated. Refresh before editing.');
 const changes=checkedChanges(body.changes);
 const changedFinish=['planned_finish_date','forecast_finish_date'].some(k=>
  Object.prototype.hasOwnProperty.call(changes,k)&&changes[k]!==old[k]);
 if(changedFinish&&!['super_admin','head_of_projects'].includes(user.role))
  throw new HttpError(403,'Only project managers can change the project end date');
 if(Object.prototype.hasOwnProperty.call(changes,'internal_owner_id')&&!['super_admin','head_of_projects'].includes(user.role))throw new HttpError(403,'Only project leads can change ownership');
 // PostgREST update includes the previous timestamp filter, giving atomic optimistic locking.
 const rows=await rest(env,`ongoing_projects?project_code=eq.${encodeURIComponent(projectCode)}&last_updated=eq.${encodeURIComponent(body.lastEdited)}&select=${projectFields}`,{token:user.token,method:'PATCH',body:changes});
 if(rows?.length!==1)throw new HttpError(409,'Project was updated or access revoked. Refresh before editing.');
 return json({project:toProject(rows[0]),warning:changedFinish?'Project end updated across the portal. Additional budget amounts were not created.':null});
})}
