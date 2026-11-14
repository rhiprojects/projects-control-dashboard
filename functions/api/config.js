import {json} from '../_lib/core.js';
export function onRequestGet({env}){return json({supabaseUrl:env.SUPABASE_URL||null,publishableKey:env.SUPABASE_PUBLISHABLE_KEY||null,configured:Boolean(env.SUPABASE_URL&&env.SUPABASE_PUBLISHABLE_KEY)})}
