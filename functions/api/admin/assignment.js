import {handler,identity,adminOnly,json,HttpError} from '../../_lib/core.js';
export function onRequestPost({request,env}){return handler(async()=>{const user=await identity(request,env);adminOnly(user);throw new HttpError(403,'Project assignment editing is not yet activated; current assignments are preserved.');})}
