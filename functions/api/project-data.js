import {handler,identity,getProject,rest,json,code} from '../_lib/core.js';
export function onRequestGet({request,env}){return handler(async()=>{
 const user=await identity(request,env),url=new URL(request.url),pcode=code(String(url.searchParams.get('code')||''));
 await getProject(env,user,pcode);
 const esc=encodeURIComponent(pcode), t=user.token;
 const [monthly,lines,actuals,documents,history,people]=await Promise.all([
 rest(env,`project_monthly_budgets?project_code=eq.${esc}&select=project_code,period_start,currency,baseline_amount,current_amount,baseline_formula,updated_at&order=period_start.asc&limit=1000`,{token:t}),
 rest(env,`project_budget_lines?project_code=eq.${esc}&select=id,period_start,category,detail,currency,baseline_amount,current_amount,baseline_formula,updated_at&order=period_start.asc&limit=2000`,{token:t}),
 rest(env,`project_pnl_actuals?project_code=eq.${esc}&select=id,period_start,account_name,currency,amount,updated_at&order=period_start.asc&limit=2000`,{token:t}),
 rest(env,`project_documents?project_code=eq.${esc}&select=id,document_type,original_name,preview_pdf_path,uploaded_at,confirmed_at,extraction_preview&order=uploaded_at.desc&limit=100`,{token:t}),
 rest(env,`financial_change_history?project_code=eq.${esc}&select=financial_area,entry_key,field_name,previous_value,new_value,edited_at,edited_by&order=edited_at.desc&limit=150`,{token:t}),
 rest(env,'project_users?select=id,display_name,role&limit=200',{token:t})
 ]);
 return json({monthly:monthly||[],lines:lines||[],actuals:actuals||[],
  documents:(documents||[]).map(({extraction_preview,...d})=>({...d,hasExtractedData:!!extraction_preview})),
  history:history||[],people:people||[]});
})}
