import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const setup=app.slice(0,app.lastIndexOf('\ninit();'));

function frontend(fetch=()=>assert.fail('Unexpected fetch'),elements={}){
 const root={addEventListener(){},querySelectorAll:()=>[],innerHTML:''};
 const querySelector=selector=>selector==='#app'?root:elements[selector]??null;
 const matchMedia=()=>({matches:false,addEventListener(){}});
 const context=createContext({
  document:{getElementById:()=>root,querySelector},window:{matchMedia},fetch,
  HTMLInputElement:class {},HTMLSelectElement:class {},
 });
 runInContext(setup,context);
 return script=>runInContext(script,context);
}

test('category bars use proportional SVG dimensions under the existing CSP',()=>{
 const run=frontend();
 const bars=[4251508.46,100000,2838.36,1500000].map(amount=>run(`categoryBar(${amount},4251508.46)`));
 assert.deepEqual(bars.map(bar=>Number(Number(bar.match(/<rect width="([^"]+)"/)[1]).toFixed(2))),
  [100,2.35,0.07,35.28]);
 for(const bar of bars){
  assert.match(bar,/viewBox="0 0 100 10"[^>]+aria-hidden="true"/);
  assert.doesNotMatch(bar,/style=/);
 }
});

test('missing contract records and an explicitly recorded zero render differently',()=>{
 const run=frontend();
 run(`projects=[
  {status:'Active',contractCurrency:'USD',contractValue:0},
  {status:'Active',contractCurrency:'EGP',contractValue:null},
  {status:'Completed',contractCurrency:'EGP',contractValue:100}
 ];`);
 assert.equal(run("contractTotalLabel('USD')"),'0');
 assert.equal(run("contractTotalLabel('EGP')"),'Not recorded');
 assert.equal(run("moneyLabel(0,'EGP')"),'0 EGP');
 assert.equal(run("moneyLabel(null,'EGP')"),'Not recorded');
});

test('dashboard failures keep the project list and expose a retry instead of empty portfolio data',async()=>{
 const run=frontend(async()=>({ok:false,status:503,json:async()=>({error:'Unavailable'})}));
 run("me={role:'team_member',displayName:'Local'}; auth={access_token:'local'};");
 const request=run('loadDashboardV5()');
 assert.match(run('ROOT.innerHTML'),/Loading…/);
 await request;
 const page=run('overviewV4()');
 assert.match(page,/Your Active Projects/);
 assert.match(page,/Could not load this data/);
 assert.match(page,/data-action="retry-dashboard"/);
 assert.doesNotMatch(page,/Project Financial Overview/);
});

test('a late response for a previous project cannot populate the current project',async()=>{
 const responses=[];
 const run=frontend(()=>new Promise(resolve=>responses.push(resolve)));
 run("auth={access_token:'local'}; chosen='736';");
 const previous=run('loadDetailsV4()');
 run("chosen='776'; clearProjectDetails();");
 const current=run('loadDetailsV4()');
 responses[1]({ok:true,json:async()=>({documents:[],monthly:[]})});
 assert.equal(await current,true);
 responses[0]({ok:true,json:async()=>({documents:[{original_name:'Other project'}]})});
 assert.equal(await previous,false);
 assert.equal(run('detailsV4.documents.length'),0);
});

test('project detail failure retains independently loaded financial analysis',async()=>{
 const run=frontend(async()=>({ok:false,status:503,json:async()=>({error:'Unavailable'})}));
 run(`auth={access_token:'local'}; me={role:'team_member',userId:'member'};
  chosen='776'; projects=[{id:'776',client:'Example',contractValue:0,contractCurrency:'USD',progress:null}];
  dashboardV5={monthlyBudgets:[],budgetLines:[],actuals:[]};`);
 const request=run('loadDetailsV4()');
 assert.match(run('projectViewV4()'),/Loading…/);
 assert.equal(await request,true);
 const page=run('projectViewV4()');
 assert.match(page,/data-action="retry-details"/);
 assert.match(page,/Project Financial Analysis/);
 assert.match(page,/0 USD/);
 assert.doesNotMatch(page,/No contract attached/);
});

test('create navigation distinguishes clean defaults, cancellation and confirmed discard',async()=>{
 let onClose;
 const dialog={
  open:false,
  addEventListener(type,listener){assert.equal(type,'close');onClose=listener;},
  showModal(){this.open=true;},
  close(value){this.open=false;this.returnValue=value;onClose();},
 };
 const elements={'#discard-project-draft':dialog};
 const run=frontend(undefined,elements);
 const currency=run(`Object.assign(new HTMLSelectElement(),{
  options:[{selected:true,defaultSelected:true},{selected:false,defaultSelected:false}]
 })`);
 const code=run("Object.assign(new HTMLInputElement(),{type:'text',value:'',defaultValue:'',validity:{badInput:false}})");
 elements['#create-v4']={elements:[currency,code]};
 assert.equal(await run('canLeaveCreate()'),true);
 assert.equal(dialog.open,false);
 code.value='local draft';
 const stay=run('canLeaveCreate()');
 assert.equal(dialog.open,true);
 dialog.close('stay');
 assert.equal(await stay,false);
 assert.equal(code.value,'local draft');
 const discard=run('canLeaveCreate()');
 dialog.close('discard');
 assert.equal(await discard,true);
});
