import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const page=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const headers=readFileSync(new URL('../public/_headers',import.meta.url),'utf8');
function fixture(){
 const root={addEventListener(){},querySelectorAll(){return []},innerHTML:''};
 const cx=createContext({document:{getElementById:()=>root},window:{matchMedia:()=>({matches:false,addEventListener(){}})}});
 const run=code=>runInContext(code,cx);
 run(app.slice(0,app.lastIndexOf('\ninit();')));
 run(`
  me={role:'head_of_projects',displayName:'Projects Lead',userId:'local'};
  chosen='776';detailsV4=null;
  projects=[{id:'776',displayName:'Slag Mill KSA (RICG)',client:'RICG',scope:'Project',
   status:'Active',contractCurrency:'USD',contractValue:303000,progress:null,location:null,
   startDate:null,baselineFinish:null,forecastFinish:null,durationMonths:5,internalOwnerId:null}];
  dashboardV5={monthlyBudgets:Array.from({length:12},(_,i)=>({
   project_code:'776',period_start:'2027-'+String(i+1).padStart(2,'0')+'-01',
   currency:'EGP',baseline_amount:i<5?100:0,current_amount:i<5?100:0
  })),budgetLines:[],actuals:[],assignments:[],people:[]};
 `);
 return run;
}
test('Project Information displays project end first, using budget-derived May 2027',()=>{
 const run=fixture(),html=run('projectViewV4()');
 assert.match(html,/Project end/);
 assert.match(html,/May 2027/);
 assert.ok(html.indexOf('Project end')<html.indexOf('Internal owner'));
 assert.match(html,/Planned finish \(exact date\)/);
});
test('Financials register and Milestones show the same end',()=>{
 const run=fixture();
 assert.match(run('financePageV4()'),/Project end/);
 assert.match(run('financePageV4()'),/May 2027/);
 assert.match(run('milestonesPageV4()'),/May 2027/);
 assert.match(run('reportPageV4()'),/May 2027/);
});
test('manager extension is reflected without inventing budget amounts',()=>{
 const run=fixture();
 run("projects[0].forecastFinish='2027-09-18'");
 assert.match(run('projectViewV4()'),/2027-09-18/);
 assert.match(run('milestonesPageV4()'),/2027-09-18/);
 assert.equal(run('dashboardV5.monthlyBudgets[8].baseline_amount'),0);
});
test('versioned portal assets and no-store headers prevent stale static JS',()=>{
 assert.match(page,/app\.js\?v=20261115-end-display/);
 assert.match(page,/styles\.css\?v=20261115-end-display/);
 assert.match(headers,/\/app\.js\s+Cache-Control: no-store/);
 assert.match(headers,/\/index\.html\s+Cache-Control: no-store/);
});
