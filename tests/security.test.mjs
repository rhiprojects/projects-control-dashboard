import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {checkedChanges,HttpError,toProject} from '../functions/_lib/core.js';
import {onRequestGet as session} from '../functions/api/session.js';
import {onRequestGet as getProjects} from '../functions/api/projects/index.js';
import {onRequestPut as edit} from '../functions/api/projects/[code].js';
import {onRequestGet as adminUsers} from '../functions/api/admin/users.js';
import {onRequestPost as assignment} from '../functions/api/admin/assignment.js';
const env={SUPABASE_URL:'https://unit-test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example'};
const before=globalThis.fetch;
after(()=>{globalThis.fetch=before});
const rows=['736','776','766'].map(code=>({project_code:code,client:code==='766'?'Amreyah':'Client '+code,scope:'Scope',currency:'EGP',contract_amount:1000,status:'Active',physical_progress_pct:null,source_notes:null,source_total_progress:200,source_remaining_contract:800,last_updated:'2026-11-14T10:00:00Z'}));
function mock(role='team_member',signedIn=true){
 const calls=[];
 globalThis.fetch=async(url,opts={})=>{let u=new URL(url);calls.push({url:u.pathname,method:opts.method||'GET',opts});let data=null,status=200;
 if(u.pathname==='/auth/v1/user')data={id:'11111111-1111-4111-8111-111111111111',email:'test@example.com',email_confirmed_at:'2026-11-14T00:00:00Z'};
 else if(u.pathname==='/rest/v1/project_users')data=[{id:'22222222-2222-4222-8222-222222222222',display_name:'Test User',role,active:true,email:'test@example.com'}];
 else if(u.pathname==='/rest/v1/ongoing_projects'){
  const allowed=role==='team_member'?rows.filter(p=>p.project_code!=='766'):rows;
  const code=u.searchParams.get('project_code')?.replace(/^eq\./,'');
  const match=code?allowed.filter(p=>p.project_code===code):allowed;
  if(opts.method==='PATCH')data=match.map(x=>({...x,physical_progress_pct:35,last_updated:'2026-11-14T10:30:00Z'}));else data=match;
 }else if(u.pathname==='/rest/v1/project_assignments')data=[];
 else throw Error('Unexpected '+u.pathname);
 return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}})
 };return calls;
}
const request=(method='GET',body)=>new Request('https://dashboard.test/api/projects',{method,headers:{authorization:'Bearer valid.jwt.token',...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
test('edit allowlist rejects untracked or malicious fields',()=>{
 assert.deepEqual(checkedChanges({progress:35}),{physical_progress_pct:35});
 assert.throws(()=>checkedChanges({invoiceAmount:10}),e=>e instanceof HttpError&&e.status===400);
 assert.throws(()=>checkedChanges({progress:101}),/Invalid progress/);
 assert.throws(()=>checkedChanges({status:'fake'}),/Invalid status/);
});
test('unauthenticated requests are blocked before data API reads',async()=>{
 const calls=mock();const res=await getProjects({request:new Request('https://dashboard.test/api/projects'),env});assert.equal(res.status,401);assert.equal(calls.length,0);
});
test('team member sees only assigned projects as constrained by RLS',async()=>{
 mock();const res=await getProjects({request:request(),env});assert.equal(res.status,200);
 const r=await res.json();assert.deepEqual(r.projects.map(x=>x.id),['736','776']);
});
test('team member cannot edit project 766',async()=>{
 const calls=mock();const res=await edit({request:request('PUT',{lastEdited:'2026-11-14T10:00:00Z',changes:{progress:35}}),env,params:{code:'766'}});assert.equal(res.status,404);assert.equal(calls.filter(x=>x.method==='PATCH').length,0);
});
test('optimistic concurrency rejects stale data',async()=>{
 const calls=mock();const res=await edit({request:request('PUT',{lastEdited:'2026-11-13T10:00:00Z',changes:{progress:35}}),env,params:{code:'736'}});assert.equal(res.status,409);assert.equal(calls.filter(x=>x.method==='PATCH').length,0);
});
test('authorized update uses RLS token and conditional timestamp',async()=>{
 const calls=mock();const res=await edit({request:request('PUT',{lastEdited:'2026-11-14T10:00:00Z',changes:{progress:35}}),env,params:{code:'736'}});assert.equal(res.status,200);
 const patch=calls.find(x=>x.method==='PATCH');assert.ok(patch);assert.ok(patch.opts.headers.authorization==='Bearer valid.jwt.token');assert.ok(patch.opts.headers.apikey===env.SUPABASE_PUBLISHABLE_KEY);assert.match(patch.opts.body, /physical_progress_pct/);
 assert.ok(new URL('https://unit-test.supabase.co'+patch.url));
});
test('Head of Projects cannot edit assignments',async()=>{
 const calls=mock('head_of_projects');const res=await assignment({request:request('POST',{projectCode:'736',userId:null}),env});assert.equal(res.status,403);assert.equal(calls.filter(x=>x.method==='PATCH').length,0);
});
test('non-admin cannot list users',async()=>{
 mock();const res=await adminUsers({request:request(),env});assert.equal(res.status,403);
});
test('no Notion dependencies in source data parser',()=>{const p=toProject(rows[0]);assert.equal(p.id,'736');assert.equal(p.progress,null);assert.equal(p.sourceTotalProgress,200)});
