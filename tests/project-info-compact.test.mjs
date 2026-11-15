import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
const index=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

function fixture(){
 const root={addEventListener(){},querySelectorAll(){return []},innerHTML:''};
 const cx=createContext({document:{getElementById:()=>root},window:{matchMedia:()=>({matches:false,addEventListener(){}})}});
 const run=code=>runInContext(code,cx);
 run(app.slice(0,app.lastIndexOf('\ninit();')));
 run(`
  me={role:'head_of_projects',displayName:'Projects Director',userId:'lead'};
  chosen='782';detailsV4=null;
  projects=[
   {id:'782',displayName:'Sky Ports',client:'Sky Ports',scope:'Silo construction',status:'Active',
    contractCurrency:'EGP',contractValue:7505000,progress:null,sourceTotalProgress:3155952,
    sourceRemaining:4349048,location:null,startDate:null,baselineFinish:null,forecastFinish:null,
    durationMonths:3,internalOwnerId:null},
   {id:'776',displayName:'Slag Mill KSA',client:'RICG',scope:'Grinding plant',status:'Active',
    contractCurrency:'USD',contractValue:303000,progress:null,sourceTotalProgress:88566,
    sourceRemaining:214434,location:null,startDate:null,baselineFinish:null,forecastFinish:null,
    durationMonths:5,internalOwnerId:null}
  ];
  dashboardV5={monthlyBudgets:[
   ...Array.from({length:12},(_,i)=>({project_code:'782',
    period_start:'2027-'+String(i+1).padStart(2,'0')+'-01',currency:'EGP',
    baseline_amount:i<3?100:0,current_amount:i<3?100:0})),
   ...Array.from({length:12},(_,i)=>({project_code:'776',
    period_start:'2027-'+String(i+1).padStart(2,'0')+'-01',currency:'EGP',
    baseline_amount:i<5?100:0,current_amount:i<5?100:0}))
  ],budgetLines:[],actuals:[],assignments:[],people:[]};
 `);
 return run;
}
function infoPanel(html){
 const found=html.match(/<section class="card panel v4-section v4-project-info">([\s\S]*?)<\/section>/);
 assert.ok(found,'Project Information panel must exist');
 return found[1];
}

test('Project Information hides Internal owner and Planned finish for all listed projects',()=>{
 const run=fixture();
 for(const code of ['782','776']){
  run(`chosen='${code}'`);
  const panel=infoPanel(run('projectViewV4()'));
  assert.doesNotMatch(panel,/Internal owner/);
  assert.doesNotMatch(panel,/Planned finish \(exact date\)/);
  assert.equal((panel.match(/class="v4-fact"/g)||[]).length,12);
  assert.match(panel,/Project end/);
  assert.match(panel,/Contract value/);
  assert.match(panel,/Financial progress/);
 }
});

test('Project end and all remaining financial values are preserved',()=>{
 const run=fixture();
 const sky=infoPanel(run('projectViewV4()'));
 assert.match(sky,/March 2027/);
 assert.match(sky,/7,505,000 EGP/);
 assert.match(sky,/3,155,952 EGP/);
 assert.match(sky,/4,349,048 EGP/);
 run("chosen='776'");
 assert.match(infoPanel(run('projectViewV4()')),/May 2027/);
});

test('Existing edit form retains internal owner and planned finish data handling',()=>{
 const run=fixture(),form=run('editProjectV4()');
 assert.match(form,/Internal project owner/);
 assert.match(form,/Planned finish \(exact date\)/);
});

test('Project Information has its own compact responsive styling without changing other forms',()=>{
 assert.match(css,/\.v4-project-info \.v4-facts\s*\{/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/@media \(max-width:1050px\)/);
 assert.match(css,/@media \(max-width:640px\)/);
 assert.match(index,/app\.js\?v=20261115-project-info-compact/);
 assert.match(index,/styles\.css\?v=20261115-project-info-compact/);
});
