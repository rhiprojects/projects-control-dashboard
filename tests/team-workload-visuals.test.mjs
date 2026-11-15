import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');

const section=(a,b)=>{
 const start=app.indexOf(a),end=app.indexOf(b,start);
 assert.ok(start>=0&&end>start,'Cannot locate expected frontend section: '+a);
 return app.slice(start,end);
};
const teamFunction=section('function v5TeamPanel(){','function v5Portfolio(');
const testProjects=['736','776','782','800','818.01','822','824'].map(id=>({id}));
const people=[
 {id:'head',role:'head_of_projects',active:true,display_name:'Head of Projects'},
 {id:'engineer',role:'team_member',active:true,display_name:'Site Engineer'},
 {id:'admin',role:'super_admin',active:true,display_name:'System Admin'},
 {id:'inactive',role:'team_member',active:false,display_name:'Inactive Member'}
];
const assignments=[
 {project_code:'736',user_id:'engineer'},
 {project_code:'776',user_id:'engineer'},
 {project_code:'999',user_id:'engineer'},
 {project_code:'782',user_id:'inactive'}
];
function teamFixture(projects=testProjects){
 const captured=[];
 const mockChart=(...args)=>{captured.push(args);return '<div>Chart placeholder</div>'};
 const factory=new Function('dashboardV5','projects','lead','v7Chart','h',
   teamFunction+';return v5TeamPanel();');
 const html=factory({people,assignments},projects,()=>true,mockChart,value=>String(value));
 return {html,chart:captured[0]};
}
test('team chart and roster show members only, not the manager or administrator',()=>{
 const {html,chart}=teamFixture();
 assert.equal(chart[1],'horizontal');
 assert.deepEqual(chart[2],['Site Engineer']);
 assert.deepEqual(chart[3][0].values,[2]);
 assert.equal(chart[5].maxProjects,7);
 assert.match(html,/Assigned Projects/);
 assert.match(html,/Project codes/);
 assert.match(html,/736, 776/);
 assert.doesNotMatch(html,/Head of Projects<\/strong>|System Admin|Inactive Member|999|Portfolio oversight/);
 assert.ok(html.indexOf('v8-team-graph')<html.indexOf('v8-team-members'),'Chart is on the left of the roster');
});
test('axis maximum uses all visible projects while bars use direct member assignments',()=>{
 const {chart,html}=teamFixture(testProjects.slice(0,3));
 assert.equal(chart[5].maxProjects,3);
 assert.deepEqual(chart[3][0].values,[2]);
 assert.deepEqual(chart[2],['Site Engineer']);
 assert.match(html,/736, 776/);
});
test('horizontal ECharts uses project count on x and member names on y without fractional ticks',async()=>{
 const body=section('async function v7RenderCharts(){','function v5FinancialPanel(');
 const payload={kind:'horizontal',labels:['Site Engineer'],
  series:[{name:'Projects in Scope',values:[2]}],maxProjects:7,currency:''};
 const element={dataset:{chart:JSON.stringify(payload)},isConnected:true,textContent:''};
 let options;
 const chart={setOption:value=>{options=value},resize:()=>{},dispose:()=>{}};
 const echarts={init:()=>chart};
 const factory=new Function('ROOT','v7LoadCharts',
  body+';return v7RenderCharts;');
 await factory({querySelectorAll:()=>[element]},async()=>echarts)();
 assert.equal(options.xAxis.type,'value');
 assert.equal(options.xAxis.min,0);
 assert.equal(options.xAxis.max,7);
 assert.equal(options.xAxis.interval,1);
 assert.equal(options.xAxis.minInterval,1);
 assert.equal(options.yAxis.type,'category');
 assert.equal(options.yAxis.inverse,true);
 assert.deepEqual(options.yAxis.data,payload.labels);
 assert.deepEqual(options.series[0].data,[2]);
 assert.equal(options.xAxis.axisLabel.formatter(1.5),'');
 assert.equal(options.xAxis.axisLabel.formatter(2),'2');
});
test('vertical financial charts retain original bar orientation',async()=>{
 const body=section('async function v7RenderCharts(){','function v5FinancialPanel(');
 const payload={kind:'bar',labels:['2027-01','2027-02'],
  series:[{name:'Approved Budget',values:[100,200]}],currency:'EGP'};
 const element={dataset:{chart:JSON.stringify(payload)},isConnected:true,textContent:''};
 let options;
 const factory=new Function('ROOT','v7LoadCharts',
  body+';return v7RenderCharts;');
 await factory({querySelectorAll:()=>[element]},async()=>({init:()=>({
   setOption:value=>{options=value},resize:()=>{},dispose:()=>{}
 })}))();
 assert.equal(options.xAxis.type,'category');
 assert.equal(options.yAxis.type,'value');
});
test('palette uses only supplied five shades, preserving CSS white-space rules',()=>{
 const colors=['FFFFFF','F4F6FB','DBE2F2','B3C0DD','7B88B6','3A4061'];
 const literal=[...new Set([...css.matchAll(/#[a-fA-F0-9]{3,8}\b/g)].map(x=>x[0].slice(1).toUpperCase()))];
 for(const hex of literal)assert.ok(colors.includes(hex)||colors.some(value=>new RegExp('^'+value+'[0-9A-F]{2}$').test(hex)),hex);
 assert.match(css,/white-space:/);
 assert.match(css,/--white:/);
 assert.doesNotMatch(css,/#F4F6FB-space|--#F4F6FB/);
});

test('pure white page canvas, side-by-side workload panels and responsive stacking',()=>{
 assert.match(css,/--portal-canvas:\s*#FFFFFF/);
 assert.match(css,/\.v8-team-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,1\.45fr\)\s+minmax\(0,1fr\)/);
 assert.match(css,/@media\(max-width:1050px\)\s*\{\.v8-team-layout\s*\{grid-template-columns:1fr/);
 assert.match(css,/\.v8-team-members\s*\{[^}]*background:#FFFFFF/);
});
