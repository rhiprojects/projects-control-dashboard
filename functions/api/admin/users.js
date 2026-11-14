import {handler,identity,adminOnly,rest,json} from '../../_lib/core.js';
export function onRequestGet({request,env}){return handler(async()=>{
 const user=await identity(request,env);adminOnly(user);
 const [profiles,assignments]=await Promise.all([
  rest(env,'project_users?select=id,display_name,role,active,auth_user_id,email&order=display_name.asc',{token:user.token}),
  rest(env,'project_assignments?select=project_code,user_id&order=project_code.asc',{token:user.token})
 ]);
 return json({users:(profiles||[]).map(p=>({user_id:p.id,display_name:p.display_name,role:p.role,active:p.active,login_activated:!!p.auth_user_id})),assignments:assignments||[]});
})}
