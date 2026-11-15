import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
function fixture(){
 const context=createContext({
  document:{getElementById:()=>({addEventListener(){}})},
  window:{matchMedia:()=>({matches:false,addEventListener(){}})}
 });
 const run=code=>runInContext(code,context);
 run(app.slice(0,app.lastIndexOf('\ninit();')));
 run(`
  me={role:'team_member'};
  projects=[
   {id:'A',client:'USD contract',status:'Active',contractValue:300,contractCurrency:'USD'},
   {id:'B',client:'Euro budget',status:'Active',contractValue:0,contractCurrency:'EUR'},
   {id:'C',client:'Working only',status:'Active',contractValue:null,contractCurrency:'USD'}
  ];
  dashboardV5={monthlyBudgets:[
   {project_code:'A',period_start:'2027-01-01',currency:'EGP',baseline_amount:100,current_amount:120},
   {project_code:'A',period_start:'2027-02-01',currency:'EGP',baseline_amount:0,current_amount:null},
   {project_code:'A',period_start:'2026-01-01',currency:'EGP',baseline_amount:900,current_amount:900},
   {project_code:'B',period_start:'2027-01-01',currency:'EUR',baseline_amount:0,current_amount:0},
   {project_code:'C',period_start:'2027-01-01',currency:'USD',baseline_amount:null,current_amount:40}
  ],budgetLines:[
   {project_code:'A',period_start:'2027-01-01',currency:'EGP',category:'Personnel',baseline_amount:60},
   {project_code:'A',period_start:'2027-01-01',currency:'EGP',category:'Operating',baseline_amount:40}
  ],actuals:[],people:[],assignments:[]};
 `);
 return run;
}

test('portfolio exact values preserve budget currency, period and separate contractual amounts',()=>{
 const run=fixture(),html=run('v5Portfolio()');
 assert.match(html,/100 EGP/);
 assert.match(html,/120 EGP/);
 assert.match(html,/300 USD/);
 assert.match(html,/0 EUR/);
 assert.match(html,/40 USD/);
 assert.match(html,/No approved budget amounts recorded for this chart/);
 assert.doesNotMatch(html,/900 EGP|400 EGP|300 EGP/);
 assert.equal((html.match(/<caption>/g)||[]).length,3);
 const payloads=[...html.matchAll(/data-chart="([^"]+)"/g)].map(m=>
  JSON.parse(m[1].replaceAll('&quot;','"').replaceAll('&amp;','&')));
 assert.deepEqual(payloads.map(p=>[p.currency,p.labels,p.series[0].values]),[
  ['EGP',['A'],[100]],['EUR',['B'],[0]]
 ]);
});

test('monthly chart and exact values retain approved, working, missing and zero amounts',()=>{
 const run=fixture(),html=run('v5FinancialPanel(projects[0])');
 assert.match(html,/Working Budget/);
 assert.match(html,/120 EGP/);
 assert.match(html,/0 EGP/);
 assert.match(html,/Not recorded/);
 assert.match(html,/Revenue and COGS actuals are not recorded in USD/);
 assert.match(html,/60 EGP/);
 assert.match(html,/40 EGP/);
 assert.match(html,/scope="row">2027-02/);
 assert.doesNotMatch(html,/900 EGP/);
});

test('unreconciled category amounts stay withheld while monthly budget remains visible',()=>{
 const run=fixture();
 run('dashboardV5.budgetLines[0].baseline_amount=61');
 const html=run('v5FinancialPanel(projects[0])');
 assert.match(html,/Category comparisons are withheld/);
 assert.match(html,/100 EGP/);
 assert.doesNotMatch(html,/61 EGP|Personnel|Operating|v5-track/);
});

test('margin signs and unavailable state keep existing classification without implying a trend',()=>{
 const run=fixture();
 assert.match(run('v5Arrow(projects[0])'),/Margin unavailable/);
 run(`dashboardV5.actuals=[
  {project_code:'A',currency:'USD',account_name:'Revenue',amount:20},
  {project_code:'A',currency:'USD',account_name:'COGS',amount:30}
 ]`);
 assert.equal(run("v5Health('A','USD').margin"),-10);
 assert.match(run('v5Arrow(projects[0])'),/v5-trend down/);
 assert.match(run('v5Arrow(projects[0])'),/sign of the recorded margin/);
 run('dashboardV5.actuals[0].amount=30');
 assert.equal(run("v5Health('A','USD').margin"),0);
 assert.match(run('v5Arrow(projects[0])'),/v5-trend up/);
 run('dashboardV5.actuals[0].amount=null');
 assert.equal(run("v5Health('A','USD')"),null);
 assert.match(run('marginContext(projects[0])'),/Some recorded actual amounts are missing/);
});

test('only authorized project rows contribute to portfolio display',()=>{
 const run=fixture();
 run("projects=projects.filter(p=>p.id==='B')");
 const html=run('v5Portfolio()');
 assert.match(html,/Euro budget/);
 assert.doesNotMatch(html,/USD contract|Working only|100 EGP|120 EGP|300 USD/);
});
