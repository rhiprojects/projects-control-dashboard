import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const core=readFileSync(new URL('../functions/_lib/core.js',import.meta.url),'utf8');
const docs=readFileSync(new URL('../functions/api/documents/index.js',import.meta.url),'utf8');
const projectCreate=readFileSync(new URL('../functions/api/projects/index.js',import.meta.url),'utf8');
const assistant=readFileSync(new URL('../functions/api/assistant.js',import.meta.url),'utf8');

function fixture(){
 const root={addEventListener(){},querySelectorAll(){return []},innerHTML:''};
 const cx=createContext({document:{getElementById:()=>root},window:{matchMedia:()=>({matches:false,addEventListener(){}})}});
 const run=code=>runInContext(code,cx);
 run(app.slice(0,app.lastIndexOf('\ninit();')));
 run(`
  me={role:'head_of_projects',displayName:'Director',userId:'lead'};
  chosen='776';detailsV4=null;
  projects=[{id:'776',displayName:'Slag Mill KSA',client:'RICG',scope:'Construction',status:'Active',
   contractCurrency:'USD',contractValue:303000,progress:null,sourceTotalProgress:88566,
   sourceRemaining:214434,location:null,startDate:null,baselineFinish:null,forecastFinish:null,
   durationMonths:5,internalOwnerId:null,
   registeredReceipts:{'2024':0,'2025':57375,'2026-01':7813,'2026-02':7228,
     '2026-03':7232,'2026-04':5088,'2026-05':3831,'2026-06':0}}];
  dashboardV5={monthlyBudgets:Array.from({length:12},(_,i)=>({
   project_code:'776',period_start:'2027-'+String(i+1).padStart(2,'0')+'-01',
   currency:'EGP',baseline_amount:i<5?100:0,current_amount:i<5?100:0
  })),budgetLines:[],actuals:[],assignments:[],people:[]};
 `);
 return {run,cx};
}

test('All UI dates show only the effective end month, without uncertainty suffix',()=>{
 const {run}=fixture();
 assert.equal(run('portalProjectEndText(projects[0])'),'May 2027');
 for(const name of ['projectViewV4','overviewV4','financePageV4','milestonesPageV4','reportPageV4'])
  assert.match(run(name+'()'),/May 2027/);
 assert.doesNotMatch(run('projectViewV4()'),/budget month; day not recorded/);
 assert.doesNotMatch(assistant,/\(exact day not recorded\)/);
});
test('Project detail auto-loads registered progress amounts and receipts, not physical percent',()=>{
 const {run}=fixture();
 const html=run('projectViewV4()');
 assert.match(html,/2027 budgeted months/);
 assert.match(html,/88,566 USD/);
 assert.match(html,/214,434 USD/);
 assert.match(html,/57,375 USD/);
 assert.match(html,/0 USD/);
 assert.match(html,/Physical progress/);
 assert.match(html,/Not recorded/);
 assert.match(core,/registeredReceipts:/);
 assert.match(core,/received_2024,received_2025,jan_2026/);
});
test('Uploaded contracts and project numbers can populate blank fields without overwriting records',()=>{
 const {run,cx}=fixture();
 cx.inputs={
   projectCode:{value:'776'},
   client:{value:''},
   scope:{value:'Existing scope'},
   contractValue:{value:''},
   currency:{value:'EGP',selectedIndex:0,options:[{defaultSelected:true}]},
   location:{value:''},
   progress:{value:''},
   durationMonths:{value:''}
 };
 cx.form={elements:{namedItem:key=>cx.inputs[key]||null}};
 cx.suggestion={projectCode:'776',client:'RICG',scope:'Different scope',
   contractValue:303000,currency:'USD',location:'Saudi Arabia',progress:45,durationMonths:5};
 const result=run('autoFillMissingFields(form,suggestion)');
 assert.ok(result.added.includes('contractValue'));
 assert.ok(result.added.includes('progress'));
 assert.ok(result.conflicts.some(x=>x.includes('scope')));
 assert.equal(cx.inputs.scope.value,'Existing scope');
 assert.equal(cx.inputs.contractValue.value,'303000');
 assert.equal(cx.inputs.currency.value,'USD');
 const conflicting=run("autoFillMissingFields(form,{projectCode:'824',client:'Other Client'})");
 assert.equal(conflicting.added.length,0);
 assert.equal(cx.inputs.client.value,'RICG');
 assert.match(docs,/const suggestion=await proposed\(env,text\)/);
 assert.match(docs,/\['project_numbers','contract'\]/);
});
test('Project creation refuses an unknown contract amount and validates physical progress',()=>{
 const {run}=fixture();
 assert.match(run('createV4()'),/name="contractValue" type="number" required/);
 assert.match(run('createV4()'),/name="progress" type="number"/);
 assert.match(projectCreate,/body\.contractValue===null/);
 assert.match(projectCreate,/physical_progress_pct:progress/);
 assert.match(projectCreate,/duration>600/);
});
test('2027 budgeted duration derives from actual funded periods, independent from recorded duration',()=>{
 const {run}=fixture();
 assert.equal(run('portalBudgetCoverage(projects[0]).months'),5);
 run(`projects[0].id='800';projects[0].durationMonths=8;
 dashboardV5.monthlyBudgets=Array.from({length:12},(_,i)=>({
 project_code:'800',period_start:'2027-'+String(i+1).padStart(2,'0')+'-01',baseline_amount:i<10?10:0,current_amount:i<10?10:0}));`);
 assert.equal(run('portalBudgetCoverage(projects[0]).months'),10);
 assert.equal(run('projects[0].durationMonths'),8);
});
test('Approved import fills missing fields only and retains manager control of dates',()=>{
 const {run}=fixture();
 const updated=run("approvedChangesV4({client:'Other',location:'KSA',baselineFinish:'2027-05-15'},projects[0])");
 assert.equal(updated.location,'KSA');
 assert.equal(updated.baselineFinish,'2027-05-15');
 assert.equal(updated.client,undefined);
 assert.throws(()=>run("approvedChangesV4({projectCode:'824'},projects[0])"));
});
