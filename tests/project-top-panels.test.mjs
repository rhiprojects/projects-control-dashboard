import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
const index=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

function setup(role='head_of_projects'){
 const root={addEventListener(){},querySelectorAll(){return []},innerHTML:''};
 const cx=createContext({document:{getElementById:()=>root},window:{matchMedia:()=>({matches:false,addEventListener(){}})}});
 const run=code=>runInContext(code,cx);
 run(app.slice(0,app.lastIndexOf('\ninit();')));
 run(`
  me={role:'${role}',displayName:'Project manager',userId:'lead'};
  chosen='782';
  projects=[{id:'782',displayName:'Sky Ports',client:'Sky Ports',scope:'New silos',status:'Active',
   contractCurrency:'EGP',contractValue:7505000,progress:null,sourceTotalProgress:3155952,
   sourceRemaining:4349048,location:null,startDate:null,baselineFinish:null,forecastFinish:null,
   durationMonths:3,internalOwnerId:null}];
  dashboardV5={monthlyBudgets:Array.from({length:12},(_,i)=>({
   project_code:'782',period_start:'2027-'+String(i+1).padStart(2,'0')+'-01',
   currency:'EGP',baseline_amount:i<3?100:0,current_amount:i<3?100:0
  })),budgetLines:[],actuals:[],assignments:[],people:[]};
  detailsV4={documents:[
   {id:'contract-id',document_type:'contract',original_name:'Signed Contract.pdf',preview_pdf_path:'preview.pdf'},
   {id:'numbers-id',document_type:'project_numbers',original_name:'Project Numbers.xlsx'}
  ],assignments:[{user_id:'member-a'}],people:[
   {id:'member-a',role:'team_member',display_name:'Assigned engineer'},
   {id:'member-b',role:'team_member',display_name:'Another engineer'}
  ],monthly:[],lines:[],actuals:[],history:[]};
  pendingV4=null;
 `);
 return run;
}
function card(html,title){
 const mark='aria-label="'+title+'"';
 const start=html.indexOf(mark);
 assert.notEqual(start,-1,'Card not present: '+title);
 const end=html.indexOf('</section>',start);
 return html.slice(start,end);
}
test('Project Information at left, three compact independent sections at top right',()=>{
 const run=setup(),html=run('projectViewV4()');
 assert.match(html,/class="v4-project-top"/);
 assert.match(html,/class="v4-project-side"/);
 assert.equal((html.match(/class="card panel v4-section v4-side-card"/g)||[]).length,3);
 assert.ok(html.indexOf('Project Information')<html.indexOf('aria-label="Contract"'));
 assert.ok(html.indexOf('aria-label="Contract"')<html.indexOf('aria-label="Project Numbers"'));
 assert.ok(html.indexOf('aria-label="Project Numbers"')<html.indexOf('aria-label="Project Team"'));
 assert.ok(html.indexOf('aria-label="Project Team"')<html.indexOf('Project Financial Analysis'));
 assert.match(card(html,'Contract'),/Signed Contract.pdf/);
 assert.match(card(html,'Project Numbers'),/Project Numbers.xlsx/);
 assert.match(card(html,'Project Team'),/Assigned engineer/);
});
test('Upload, view, download, assign and document review controls keep their identifiers',()=>{
 const run=setup(),html=run('projectViewV4()');
 for(const id of ['contract-v4','numbers-v4','assign-v4'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
 assert.match(card(html,'Contract'),/data-v4="pdf"/);
 assert.match(card(html,'Contract'),/data-v4="file"/);
 assert.match(card(html,'Project Numbers'),/data-v4="file"/);
 assert.match(card(html,'Project Team'),/name="userId" required/);
 run("pendingV4={document:{document_type:'contract'},proposed:{location:'KSA'}}");
 let updated=run('projectViewV4()');
 assert.match(card(updated,'Contract'),/id="existing-proposal-v4"/);
 assert.doesNotMatch(card(updated,'Project Numbers'),/id="existing-proposal-v4"/);
 run("pendingV4={document:{document_type:'project_numbers'},proposed:{location:'KSA'}}");
 updated=run('projectViewV4()');
 assert.match(card(updated,'Project Numbers'),/id="existing-proposal-v4"/);
 assert.doesNotMatch(card(updated,'Contract'),/id="existing-proposal-v4"/);
});
test('Lower financial and historical records retain their locations with no duplicate document sections',()=>{
 const run=setup();
 const html=run('projectRecordsV4(detailsV4)');
 assert.match(html,/Monthly Budget/);
 assert.match(html,/Detailed Budget/);
 assert.match(html,/Historical P&amp;L Actuals/);
 assert.match(html,/Financial Change History/);
 assert.doesNotMatch(html,/<h2 class="paneltitle">Contract<\/h2>/);
 assert.doesNotMatch(html,/id="contract-v4"|id="numbers-v4"/);
});
test('Non-manager permissions are unchanged: document cards remain, assignment card stays restricted',()=>{
 const run=setup('team_member'),html=run('projectViewV4()');
 assert.match(html,/aria-label="Contract"/);
 assert.match(html,/aria-label="Project Numbers"/);
 assert.doesNotMatch(html,/aria-label="Project Team"/);
 assert.doesNotMatch(html,/id="assign-v4"/);
});
test('Loading and empty states do not duplicate cards or affect project information',()=>{
 const run=setup();
 run("detailsV4=null");
 let html=run('projectViewV4()');
 assert.match(html,/Project Information/);
 assert.doesNotMatch(html,/id="contract-v4"|id="assign-v4"/);
 run("detailsV4={documents:[],assignments:[],people:[],monthly:[],lines:[],actuals:[],history:[]}");
 html=run('projectViewV4()');
 assert.match(html,/No contract attached/);
 assert.match(html,/No numbers file attached/);
 assert.match(html,/No team members assigned/);
});
test('Responsive layout stays within scoped styles and updated assets',()=>{
 assert.match(css,/\.v4-project-top\{display:grid;grid-template-columns:/);
 assert.match(css,/\.v4-project-side\{display:grid;gap:/);
 assert.match(css,/@media\(max-width:1100px\)/);
 assert.match(css,/@media\(max-width:680px\)/);
 assert.match(css,/@media\(max-width:440px\)/);
 assert.match(index,/app\.js\?v=20261115-project-top-layout/);
 assert.match(index,/styles\.css\?v=20261115-project-top-layout/);
});
