import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api/assistant.js';

const savedFetch=globalThis.fetch;
after(()=>{globalThis.fetch=savedFetch});
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',
 AI_SERVICE:{fetch:async()=>Response.json({response:'Grounded model reply'})}};
const projects=[
 {project_code:'736',client:'ABM',scope:'Plant improvement',currency:'EGP',contract_amount:17000000,status:'Active',planned_start_date:'2026-01-01',planned_finish_date:'2027-12-31',physical_progress_pct:45,internal_owner_id:'owner',location:'Alexandria'},
 {project_code:'776',client:'RICG',scope:'Slag mill',currency:'USD',contract_amount:303000,status:'Active',internal_owner_id:null}
];
const people=[{id:'owner',display_name:'Sara Manager',role:'head_of_projects',active:true},{id:'eng',display_name:'Ali Engineer',role:'team_member',active:true}];
function setup({codes=['736','776'],failModel=false}={}){
 env.AI_SERVICE.fetch=async()=>failModel?new Response('Unavailable',{status:503}):Response.json({response:'Grounded model reply'});
 globalThis.fetch=async(raw,opts={})=>{
  const u=new URL(raw);
  if(u.pathname==='/auth/v1/user')return Response.json({id:'auth-id',email:'valid@example.com',email_confirmed_at:'2026-11-14'});
  if(u.pathname==='/rest/v1/project_users'&&u.searchParams.has('auth_user_id'))return Response.json([{id:'owner',display_name:'Sara Manager',role:'head_of_projects',active:true,email:'valid@example.com'}]);
  assert.equal(opts.headers.authorization,'Bearer valid.jwt.token');
  const data={
   '/rest/v1/ongoing_projects':projects.filter(p=>codes.includes(p.project_code)),
   '/rest/v1/project_users':people,
   '/rest/v1/project_assignments':codes.includes('736')?[{project_code:'736',user_id:'eng'}]:[],
   '/rest/v1/project_monthly_budgets':[
    {project_code:'736',period_start:'2027-01-01',currency:'EGP',baseline_amount:632893.58,current_amount:632893.58},
    {project_code:'776',period_start:'2027-01-01',currency:'EGP',baseline_amount:1170869.36,current_amount:1170869.36}
   ].filter(r=>codes.includes(r.project_code)),
   '/rest/v1/project_budget_lines':[],
   '/rest/v1/project_pnl_actuals':[],
   '/rest/v1/project_documents':[]
  }[u.pathname];
  assert.ok(data,'Unexpected REST endpoint '+u.pathname);
  return Response.json(data);
 };
}
async function ask(q){
 const request=new Request('https://dashboard.example/api/assistant',{method:'POST',headers:{authorization:'Bearer valid.jwt.token','content-type':'application/json'},body:JSON.stringify({question:q})});
 const response=await onRequestPost({request,env});assert.equal(response.status,200);
 return (await response.json()).answer;
}
test('basic project answers work even without AI inference',async()=>{
 setup({failModel:true});
 assert.match(await ask('How many projects can I access?'),/2 projects/);
 assert.match(await ask('What projects can I access?'),/736.*776/);
 assert.match(await ask('When does project 736 finish?'),/2027-12-31/);
});
test('owner and team assignment are distinct',async()=>{
 setup({failModel:true});
 assert.match(await ask('Who is responsible for project 736?'),/Internal owner: Sara Manager.*Assigned team members: Ali Engineer/);
 assert.match(await ask('What projects is Ali Engineer holding?'),/assigned project\(s\): 736/);
});
test('contract USD and 2027 budget EGP are not confused',async()=>{
 setup({failModel:true});
 const answer=await ask('What is the 2027 budget for project 776?');
 assert.match(answer,/303,000 USD/);
 assert.match(answer,/1,170,869.36 EGP/);
});
test('missing contract clauses and actuals are stated as unavailable',async()=>{
 setup({failModel:true});
 assert.match(await ask('What is the penalty clause for project 736?'),/not currently present in the portal/);
 assert.match(await ask('What is the recorded profit for project 736?'),/not currently present in the portal/);
});
test('project visibility stays scoped to authorized rows',async()=>{
 setup({codes:['736'],failModel:true});
 const answer=await ask('What projects can I access?');
 assert.match(answer,/736/);assert.doesNotMatch(answer,/776/);
});
test('model remains available for complex questions',async()=>{
 setup();
 assert.equal(await ask('Explain the project scope tradeoffs'), 'Grounded model reply');
});
test('unauthenticated assistant access fails before reading records',async()=>{
 setup();
 const response=await onRequestPost({request:new Request('https://dashboard.example/api/assistant',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:'Contract details?'})}),env});
 assert.equal(response.status,401);
});

test('which projects have losses is distinct from a monetary loss total',async()=>{
 setup({failModel:true});
 const result=await ask('Which projects have losses?');
 assert.match(result,/cannot identify which projects have recorded losses/i);
 assert.match(result,/not currently present in the portal/i);
 assert.doesNotMatch(result,/0 EGP|zero losses/i);
});
test('this-year incurred losses reports an unknown monetary amount, not zero or 2027 budget',async()=>{
 setup({failModel:true});
 const result=await ask('How many losses did I incur this year?');
 const year=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Cairo',year:'numeric'}).format(new Date());
 assert.match(result,new RegExp(year));
 assert.match(result,/how much loss was incurred/i);
 assert.match(result,/unknown, not zero/i);
 assert.doesNotMatch(result,/632,893|1,170,869/);
});
test('an explicit year overrides the current Cairo year',async()=>{
 setup({failModel:true});
 const result=await ask('What was my total loss in 2025?');
 assert.match(result,/2025/);
 assert.doesNotMatch(result,/2027 projected budget cannot be treated as an actual loss.*2025/);
});
test('negative budget is not treated as recorded financial loss',async()=>{
 setup({failModel:true});
 const result=await ask('Which project is losing money based on the budget?');
 assert.match(result,/cannot identify which projects have recorded losses/i);
 assert.doesNotMatch(result,/project 776 .*loss-making/i);
});
