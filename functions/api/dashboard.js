import {handler,identity,rest,json} from '../_lib/core.js';

// Read-only dashboard data. Supabase RLS scopes every query to authorized records.
export function onRequestGet({request,env}){return handler(async()=>{
 const user=await identity(request,env),token=user.token;
 const lead=['super_admin','head_of_projects'].includes(user.role);
 const [budgetLines,monthlyBudgets,actuals,assignments,people]=await Promise.all([
  rest(env,'project_budget_lines?select=project_code,period_start,category,detail,currency,baseline_amount,current_amount&order=period_start.asc&limit=2000',{token}),
  rest(env,'project_monthly_budgets?select=project_code,period_start,currency,baseline_amount,current_amount&order=period_start.asc&limit=2000',{token}),
  rest(env,'project_pnl_actuals?select=project_code,period_start,account_name,currency,amount&order=period_start.asc&limit=2000',{token}),
  lead?rest(env,'project_assignments?select=project_code,user_id&limit=2000',{token}):Promise.resolve([]),
  lead?rest(env,'project_users?select=id,display_name,role,active&limit=200',{token}):Promise.resolve([])
 ]);
 return json({budgetLines:budgetLines||[],monthlyBudgets:monthlyBudgets||[],actuals:actuals||[],assignments:lead?assignments||[]:[],people:lead?people||[]:[]});
})}
