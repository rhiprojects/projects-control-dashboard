import {handler,identity,getProject,rest,json,HttpError,code} from '../_lib/core.js';
export function onRequestPost({request,env}){return handler(async()=>{
 const user=await identity(request,env);
 if(!['super_admin','head_of_projects'].includes(user.role))throw new HttpError(403,'Only project leads can assign team members');
 let body;try{body=await request.json()}catch{throw new HttpError(400,'Invalid assignment')}
 const projectCode=code(String(body.projectCode||'')),userId=String(body.userId||'');
 if(!/^[a-f0-9-]{36}$/i.test(userId))throw new HttpError(400,'Invalid member');
 await getProject(env,user,projectCode);
 const member=await rest(env,`project_users?id=eq.${encodeURIComponent(userId)}&role=eq.team_member&active=eq.true&select=id&limit=1`,{token:user.token});
 if(member.length!==1)throw new HttpError(400,'Team member not available');
 const result=await rest(env,'project_assignments?select=project_code,user_id',{token:user.token,method:'POST',body:{project_code:projectCode,user_id:userId}});
 return json({assignment:result?.[0]},201);
})}
