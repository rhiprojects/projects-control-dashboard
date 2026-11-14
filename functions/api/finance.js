import {handler,identity,getProject,rest,json,HttpError,code} from '../_lib/core.js';
const num=(v)=>{if(v!==null&&(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1e15))throw new HttpError(400,'Invalid amount');return v;};
const allowed=['monthly','line','actual'];
export function onRequestPut({request,env}){return handler(async()=>{
 const user=await identity(request,env);
 let body;try{body=await request.json()}catch{throw new HttpError(400,'Invalid input')}
 const pcode=code(String(body.projectCode||'')),kind=String(body.kind||'');
 await getProject(env,user,pcode);
 if(!allowed.includes(kind))throw new HttpError(400,'Invalid financial record type');
 if(kind==='actual'&&!['super_admin','head_of_projects'].includes(user.role))throw new HttpError(403,'Permission denied');
 const id=kind==='monthly'?String(body.period||''):String(body.id||'');
 if(kind==='monthly'&&!/^\d{4}-\d{2}-01$/.test(id))throw new HttpError(400,'Invalid period');
 if(kind!=='monthly'&&!/^\d+$/.test(id))throw new HttpError(400,'Invalid record');
 const table={monthly:'project_monthly_budgets',line:'project_budget_lines',actual:'project_pnl_actuals'}[kind];
 const q=kind==='monthly'?`period_start=eq.${encodeURIComponent(id)}`:`id=eq.${id}`;
 const key=`project_code=eq.${encodeURIComponent(pcode)}&${q}`;
 const col=kind==='actual'?'amount':'current_amount';
 const previous=await rest(env,`${table}?${key}&select=${col},updated_at&limit=1`,{token:user.token});
 if(previous.length!==1)throw new HttpError(404,'Financial record not found');
 if(body.updatedAt!==previous[0].updated_at)throw new HttpError(409,'This value was updated. Please refresh.');
 const amount=num(body.amount);
 if(kind==='actual'&&amount===null)throw new HttpError(400,'Actual amount is required');
 const rows=await rest(env,`${table}?${key}&updated_at=eq.${encodeURIComponent(body.updatedAt)}&select=${col},updated_at`,{
  token:user.token,method:'PATCH',body:{[col]:amount}});
 if(rows?.length!==1)throw new HttpError(409,'This value was updated. Please refresh.');
 return json({record:rows[0]});
})}
export function onRequestPost({request,env}){return handler(async()=>{
 const user=await identity(request,env);
 let body;try{body=await request.json()}catch{throw new HttpError(400,'Invalid input')}
 const pcode=code(String(body.projectCode||'')),period=String(body.period||'');
 const parent=await getProject(env,user,pcode);
 if(!/^\d{4}-\d{2}-01$/.test(period))throw new HttpError(400,'Select the first day of a month');
 const exists=await rest(env,`project_monthly_budgets?project_code=eq.${encodeURIComponent(pcode)}&period_start=eq.${period}&select=project_code&limit=1`,{token:user.token});
 if(exists.length)throw new HttpError(409,'Month already exists');
 const currencyRows=await rest(env,`project_monthly_budgets?project_code=eq.${encodeURIComponent(pcode)}&select=currency&limit=1`,{token:user.token});
 const currency=currencyRows?.[0]?.currency||parent.currency;
 const rows=await rest(env,'project_monthly_budgets?select=period_start,currency,baseline_amount,current_amount,updated_at',{
  token:user.token,method:'POST',body:{project_code:pcode,period_start:period,currency,baseline_amount:null,current_amount:null}});
 return json({record:rows?.[0]},201);
})}
