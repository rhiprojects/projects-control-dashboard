import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const assistant=readFileSync(new URL('../functions/api/assistant.js',import.meta.url),'utf8');
const projectApi=readFileSync(new URL('../functions/api/projects/[code].js',import.meta.url),'utf8');

function frontend(){
 const root={addEventListener(){},querySelectorAll(){return []},innerHTML:''};
 const cx=createContext({document:{getElementById:()=>root},window:{matchMedia:()=>({matches:false,addEventListener(){}})}});
 const run=code=>runInContext(code,cx);
 run(app.slice(0,app.lastIndexOf('\ninit();')));
 run(`me={role:'super_admin',displayName:'Director',userId:'local'};
 projects=[{id:'776',client:'RICG',displayName:'Slag Mill KSA',status:'Active',contractCurrency:'USD',contractValue:100,progress:null,baselineFinish:null,forecastFinish:null}];
 dashboardV5={monthlyBudgets:Array.from({length:12},(_,i)=>({project_code:'776',period_start:'2027-'+String(i+1).padStart(2,'0')+'-01',currency:'EGP',baseline_amount:i<5?100:0,current_amount:i<5?100:0})),
 budgetLines:Array.from({length:5},(_,i)=>({project_code:'776',period_start:'2027-'+String(i+1).padStart(2,'0')+'-01',currency:'EGP',category:'Manpower',baseline_amount:100,current_amount:100})).concat([{project_code:'776',period_start:'2027-06-01',currency:'EGP',category:'Manpower',baseline_amount:300000,current_amount:300000}]),
 actuals:[],people:[],assignments:[]};`);
 return run;
}

test('776 displays the last funded approved month, not trailing zero-budget rows',()=>{
 const run=frontend();
 assert.equal(run('projectEndMonth(projects[0])'),'2027-05');
 assert.match(run('projectCard(projects[0])'),/May 2027/);
 assert.match(run('milestonesPageV4()'),/May 2027/);
 assert.match(run('reportPageV4()'),/May 2027/);
 assert.match(run('financePageV4()'),/May 2027/);
 const panel=run('v5FinancialPanel(projects[0])');
 assert.match(panel,/Current project and budget end: May 2027/);
 assert.match(panel,/2027-06 Manpower reference 300,000 EGP/);
 assert.match(panel,/retained in the budget register for audit/);
});

test('manager finish update governs displayed period without generating budget values',()=>{
 const run=frontend();
 run("projects[0].forecastFinish='2027-09-15'");
 assert.equal(run('projectEndMonth(projects[0])'),'2027-09');
 assert.match(run('projectEndLabel(projects[0])'),/September 2027 \(revised finish\)/);
 const months=run('dashboardV5.monthlyBudgets.map(x=>x.baseline_amount)');
 const panel=run('v5FinancialPanel(projects[0])');
 assert.match(panel,/2027-09/);
 assert.match(panel,/extension does not automatically add budget amounts/);
 assert.equal(Number(months[8]),0);
 assert.match(projectApi,/Only project managers can change the project end date/);
});

test('818.01 zero separate manpower is explained as COGS personnel classification',()=>{
 const run=frontend();
 run("projects[0].id='818.01';dashboardV5.monthlyBudgets.forEach(x=>x.project_code='818.01');dashboardV5.budgetLines.forEach(x=>{x.project_code='818.01';x.category='COGS - Personnel Costs';});dashboardV5.budgetLines.push({project_code:'818.01',period_start:'2027-01-01',currency:'EGP',category:'Manpower',baseline_amount:0,current_amount:0});");
 const panel=run('v5FinancialPanel(projects[0])');
 assert.match(panel,/separate Manpower is correctly zero/);
 assert.match(panel,/Do not double-count personnel/);
});

test('AI schedule uses last funded month but makes no exact-day claim',()=>{
 const cx=createContext({});
 const src=assistant.replace(/^import .*;$/gm,'').replace('export function onRequestPost','function onRequestPost');
 const run=code=>runInContext(code,cx);
 run(src);
 const data=[
  {period_start:'2027-01-01',currency:'EGP',baseline_amount:200,current_amount:200},
  {period_start:'2027-05-01',currency:'EGP',baseline_amount:200,current_amount:200},
  {period_start:'2027-06-01',currency:'EGP',baseline_amount:0,current_amount:0}
 ];
 cx.data=data;
 run("var a=projectLine({project_code:'776',client:'RICG',planned_finish_date:null,forecast_finish_date:null},null,[],data)");
 assert.equal(run('a.current_project_end_month'),'2027-05');
 assert.match(run('a.current_project_end_basis'),/day not recorded/);
 run("var b=projectLine({project_code:'776',client:'RICG',planned_finish_date:null,forecast_finish_date:'2027-09-15'},null,[],data)");
 assert.equal(run('b.current_project_end_month'),'2027-09');
});
