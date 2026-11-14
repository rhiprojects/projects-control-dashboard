import {handler,identity,rest,getProject,json,HttpError,code} from '../_lib/core.js';
function period(value){if(typeof value!=='string'||!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(value)||Number(value.slice(0,4))<2020||Number(value.slice(0,4))>2100)throw new HttpError(400,'Choose a valid month');return value}
function amount(value){if(value===null||value==='')return null;const n=Number(value);if(!Number.isFinite(n)||Math.abs(n)>1e14)throw new HttpError(400,'Invalid financial amount');return n}
export async function onRequestGet({request,env}){return handler(async()=>{
 const user=await identity(request,env),url=new URL(request.url),proj=url.searchParams.get('project');
 if(proj)await getProject(env,user,code(proj));
 const where=proj?`&project_code=eq.${encodeURIComponent(proj)}`:'';
 const budgets=await rest(env,`project_monthly_budgets?select=project_code,period_start,currency,baseline_amount,current_amount,updated_at${where}&order=period_start.asc,project_code.asc`,{token:user.token});
 const lines=proj?await rest(env,`project_budget_lines?select=id,project_code,period_start,category,detail,currency,baseline_amount,current_amount,updated_at${where}&order=period_start.asc,category.asc`,{token:user.token}):[];
 const actuals=proj?await rest(env,`project_pnl_actuals?select=id,project_code,period_start,account_name,currency,amount,updated_at${where}&order=period_start.desc`,{token:user.token}):[];
 const history=proj?await rest(env,`financial_change_history?select=project_code,financial_area,entry_key,field_name,previous_value,new_value,edited_by,edited_at${where}&order=edited_at.desc&limit=100`,{token:user.token}):[];
 return json({budgets:budgets||[],lines:lines||[],actuals:actuals||[],history:history||[]});
})}
export async function onRequestPost({request,env}){return handler(async()=>{
 const user=await identity(request,env);
 let b;try{b=await request.json()}catch{throw new HttpError(400,'Invalid form')}
 const proj=code(String(b?.projectCode||''));await getProject(env,user,proj);
 const action=b.action;let rows;
 if(action==='add_period'){
  const p=period(b.period);
  const old=await rest(env,`project_monthly_budgets?project_code=eq.${encodeURIComponent(proj)}&period_start=eq.${p}&select=project_code&limit=1`,{token:user.token});
  if(old?.length)throw new HttpError(409,'This month already exists');
  rows=await rest(env,`project_monthly_budgets?select=project_code,period_start,currency,baseline_amount,current_amount,updated_at`,{token:user.token,method:'POST',body:{project_code:proj,period_start:p,currency:['EGP','USD','EUR','Other'].includes(b.currency)?b.currency:'EGP',current_amount:b.amount===undefined?null:amount(b.amount)}});
 }else if(action==='update_budget'){
  const p=period(b.period),v=amount(b.amount);
  const existing=await rest(env,`project_monthly_budgets?project_code=eq.${encodeURIComponent(proj)}&period_start=eq.${p}&select=current_amount,updated_at&limit=1`,{token:user.token});
  if(!existing?.length)throw new HttpError(404,'Budget month not found');
  if(existing[0].current_amount!==null&&Number(existing[0].current_amount)===v||existing[0].current_amount===null&&v===null)return json({unchanged:true});
  rows=await rest(env,`project_monthly_budgets?project_code=eq.${encodeURIComponent(proj)}&period_start=eq.${p}&updated_at=eq.${encodeURIComponent(existing[0].updated_at)}&select=project_code,period_start,currency,baseline_amount,current_amount,updated_at`,{token:user.token,method:'PATCH',body:{current_amount:v}});
 }else if(action==='update_line'){
  const id=Number(b.id),v=amount(b.amount);
  if(!Number.isInteger(id)||id<1)throw new HttpError(400,'Invalid budget line');
  const existing=await rest(env,`project_budget_lines?id=eq.${id}&project_code=eq.${encodeURIComponent(proj)}&select=updated_at&limit=1`,{token:user.token});
  if(!existing?.length)throw new HttpError(404,'Budget line not found');
  rows=await rest(env,`project_budget_lines?id=eq.${id}&project_code=eq.${encodeURIComponent(proj)}&updated_at=eq.${encodeURIComponent(existing[0].updated_at)}&select=id,project_code,period_start,category,detail,current_amount,baseline_amount,updated_at`,{token:user.token,method:'PATCH',body:{current_amount:v}});
 }else if(action==='update_actual'){
  if(!['head_of_projects','super_admin'].includes(user.role))throw new HttpError(403,'Historical actuals are read-only');
  const id=Number(b.id),v=amount(b.amount);
  if(!Number.isInteger(id)||id<1||v===null)throw new HttpError(400,'Invalid actual value');
  const existing=await rest(env,`project_pnl_actuals?id=eq.${id}&project_code=eq.${encodeURIComponent(proj)}&select=updated_at&limit=1`,{token:user.token});
  if(!existing?.length)throw new HttpError(404,'Actual record not found');
  rows=await rest(env,`project_pnl_actuals?id=eq.${id}&project_code=eq.${encodeURIComponent(proj)}&updated_at=eq.${encodeURIComponent(existing[0].updated_at)}&select=id,project_code,period_start,amount,updated_at`,{token:user.token,method:'PATCH',body:{amount:v}});
 }else throw new HttpError(400,'Unsupported financial action');
 if(rows?.length!==1)throw new HttpError(409,'Financial record changed; refresh and retry');
 return json({record:rows[0]});
})}
