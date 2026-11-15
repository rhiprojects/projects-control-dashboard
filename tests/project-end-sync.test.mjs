import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const endpoint=readFileSync(new URL('../functions/api/projects/[code].js',import.meta.url),'utf8');
const assistant=readFileSync(new URL('../functions/api/assistant.js',import.meta.url),'utf8');

function fixture(){
 const context=createContext({
  document:{getElementById:()=>({addEventListener(){}})},
  window:{matchMedia:()=>({matches:false,addEventListener(){}})}
 });
 const run=code=>runInContext(code,context);
 run(app.slice(0,app.lastIndexOf('\ninit();')));
 run(`
  me={role:'head_of_projects',userId:'test',displayName:'Project Manager'};
  projects=[{id:'776',client:'RICG',displayName:'Slag Mill KSA (RICG)',scope:'Project',status:'Active',
   contractCurrency:'USD',contractValue:303000,baselineFinish:null,forecastFinish:null,progress:null}];
  dashboardV5={monthlyBudgets:Array.from({length:12},(_,i)=>({
   project_code:'776',period_start:'2027-'+String(i+1).padStart(2,'0')+'-01',currency:'EGP',
   baseline_amount:i<5?1170869.36412:0,current_amount:i<5?1170869.36412:0
  })),budgetLines:[{project_code:'776',period_start:'2027-06-01',
   category:'Manpower',currency:'EGP',baseline_amount:300000}],actuals:[],people:[],assignments:[]};
 `);
 return run;
}

test('Project 776 ends May 2027 from approved budget without inventing a day',()=>{
 const run=fixture();
 assert.equal(run('portalProjectEnd(projects[0]).month'),'2027-05');
 assert.equal(run('portalProjectEndText(projects[0])'),'May 2027');
 assert.equal(run('portalScheduledMonths(projects[0],dashboardV5.monthlyBudgets).length'),5);
});

test('June 2027 manpower is retained as an audit exception, not a sixth budget month',()=>{
 const run=fixture();
 const note=run('portalOutsideManpower(projects[0])');
 assert.match(note,/2027-06/);
 assert.match(note,/not part of the approved monthly project budget/);
 assert.equal(run('portalScheduledMonths(projects[0],dashboardV5.monthlyBudgets).length'),5);
});

test('authorized manager finish-date override updates all schedule surfaces without adding money',()=>{
 const run=fixture();
 run("projects[0].forecastFinish='2027-09-18'");
 assert.equal(run('portalProjectEnd(projects[0]).month'),'2027-09');
 assert.match(run('portalProjectEndText(projects[0])'),/2027-09-18/);
 assert.equal(run('portalScheduledMonths(projects[0],dashboardV5.monthlyBudgets).length'),9);
 assert.match(run('projectCard(projects[0])'),/2027-09-18/);
});

test('earlier finish date does not silently discard existing nonzero financial records',()=>{
 const run=fixture();
 run("projects[0].forecastFinish='2027-04-18'");
 assert.equal(run('portalScheduledMonths(projects[0],dashboardV5.monthlyBudgets).length'),5);
});

test('a separate zero manpower allocation remains recorded zero and is not replaced',()=>{
 const run=fixture();
 run(`dashboardV5.monthlyBudgets=Array.from({length:12},(_,i)=>({
  project_code:'818.01',period_start:'2027-'+String(i+1).padStart(2,'0')+'-01',
  currency:'EGP',baseline_amount:i<10?21506.716:0,current_amount:i<10?21506.716:0
 }));
 dashboardV5.budgetLines=[{project_code:'818.01',period_start:'2027-01-01',
  category:'Manpower',baseline_amount:0,currency:'EGP'}];`);
 assert.equal(run("portalProjectEnd({id:'818.01',forecastFinish:null,baselineFinish:null}).month"),'2027-10');
 assert.equal(run('dashboardV5.budgetLines[0].baseline_amount'),0);
});

test('backend restricts completion edits to leads; assistant uses current end and funded periods',()=>{
 assert.match(endpoint,/Only project leads can change completion dates/);
 assert.match(assistant,/project_end_month:projectEndMonth/);
 assert.match(assistant,/fundedMonths\.has/);
});
