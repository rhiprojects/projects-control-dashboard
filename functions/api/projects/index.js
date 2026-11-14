import {handler,identity,rest,projectFields,toProject,json} from '../../_lib/core.js';
export function onRequestGet({request,env}){return handler(async()=>{const user=await identity(request,env);const rows=await rest(env,`ongoing_projects?select=${projectFields}&order=project_code.asc`,{token:user.token});return json({projects:(rows||[]).map(toProject),source:'supabase',role:user.role})})}
