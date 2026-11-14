import {handler,identity,json} from '../_lib/core.js';
export function onRequestGet({request,env}){return handler(async()=>{const u=await identity(request,env);return json({displayName:u.name,role:u.role,userId:u.profileId})})}
