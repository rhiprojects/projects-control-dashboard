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
async function chatTurn(question,clarification=null){
 const request=new Request('https://dashboard.example/api/assistant',{method:'POST',headers:{authorization:'Bearer valid.jwt.token','content-type':'application/json'},body:JSON.stringify({question,clarification})});
 const response=await onRequestPost({request,env});assert.equal(response.status,200);
 return response.json();
}
async function ask(q){return (await chatTurn(q)).answer;}
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

test('loss-making projects question asks a gross/net clarification and remembers the question',async()=>{
 setup({failModel:true});
 const first=await chatTurn('Which projects have losses?');
 assert.match(first.answer,/gross loss.*net loss/i);
 assert.equal(first.clarification.kind,'loss_basis');
 assert.equal(first.clarification.originalQuestion,'Which projects have losses?');
 const next=await chatTurn('Gross loss',first.clarification);
 assert.match(next.answer,/cannot identify which projects have recorded losses/i);
 assert.match(next.answer,/gross-loss basis/i);
 assert.match(next.answer,/not currently present in the portal/i);
 assert.equal(next.clarification,undefined);
});
test('year-to-date incurred-loss amount remains distinct after clarification',async()=>{
 setup({failModel:true});
 const first=await chatTurn('How many losses did I incur this year?');
 assert.match(first.answer,/gross loss.*net loss/i);
 const next=await chatTurn('Net',first.clarification);
 const year=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Cairo',year:'numeric'}).format(new Date());
 assert.match(next.answer,new RegExp(year));
 assert.match(next.answer,/how much loss was incurred/i);
 assert.match(next.answer,/net-loss basis/i);
 assert.match(next.answer,/unknown, not zero/i);
 assert.doesNotMatch(next.answer,/632,893|1,170,869/);
});
test('explicit year in follow-up overrides original Cairo current-year request',async()=>{
 setup({failModel:true});
 const first=await chatTurn('What was my total loss this year?');
 const next=await chatTurn('Gross in 2025',first.clarification);
 assert.match(next.answer,/2025/);
 assert.match(next.answer,/gross-loss basis/i);
});
test('both is a valid clarification and never creates invented loss amounts',async()=>{
 setup({failModel:true});
 const first=await chatTurn('What are our losses this year?');
 const next=await chatTurn('Both',first.clarification);
 assert.match(next.answer,/both gross and net loss/i);
 assert.match(next.answer,/unknown, not zero/i);
});
test('a new unrelated question cancels the pending loss clarification',async()=>{
 setup({failModel:true});
 const first=await chatTurn('Which projects have losses?');
 const next=await chatTurn('How many projects can I access?',first.clarification);
 assert.match(next.answer,/2 projects/);
 assert.equal(next.clarification,undefined);
});
test('cancelling clarification does not evaluate a loss or alter data',async()=>{
 setup({failModel:true});
 const first=await chatTurn('Which projects have losses?');
 const next=await chatTurn('Cancel',first.clarification);
 assert.match(next.answer,/set aside that question/i);
 assert.equal(next.clarification,undefined);
});
test('gross/net accounting basis already in the question needs no follow-up',async()=>{
 setup({failModel:true});
 const next=await chatTurn('Which projects had gross losses in 2025?');
 assert.match(next.answer,/gross-loss basis/i);
 assert.equal(next.clarification,undefined);
});
test('negative budget is not treated as recorded financial loss',async()=>{
 setup({failModel:true});
 const result=await ask('Which project is losing money based on the budget?');
 assert.match(result,/gross loss.*net loss/i);
 assert.doesNotMatch(result,/project 776 .*loss-making/i);
});

test('natural language monetary loss question still asks for basis',async()=>{
 setup({failModel:true});
 const first=await chatTurn('How much money did I lose this year?');
 assert.equal(first.clarification?.kind,'loss_basis');
 const next=await chatTurn('Gross',first.clarification);
 assert.match(next.answer,/how much loss was incurred/i);
 assert.match(next.answer,/gross-loss basis/i);
 assert.match(next.answer,/unknown, not zero/i);
});
test('unsure response explains options while keeping original question pending',async()=>{
 setup({failModel:true});
 const first=await chatTurn('Which projects have losses?');
 const next=await chatTurn('Not sure',first.clarification);
 assert.equal(next.clarification?.originalQuestion,'Which projects have losses?');
 assert.match(next.answer,/gross loss.*net loss/i);
});
test('unrelated question that mentions gross starts new topic',async()=>{
 setup({failModel:true});
 const first=await chatTurn('Which projects have losses?');
 const next=await chatTurn('What is the gross budget for project 736?',first.clarification);
 assert.equal(next.clarification,undefined);
 assert.match(next.answer,/project 736/i);
});
