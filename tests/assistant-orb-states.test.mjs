import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
const start=app.indexOf('const aiOrbLabelsV9=');
const end=app.indexOf('function aiPanelV4(){',start);
assert.ok(start>=0&&end>start,'AI matrix functions must exist in the frontend');
const helpers=app.slice(start,end);

function harness(busy=true){
 const nodes={scene:{dataset:{state:'start'}},label:{textContent:''}};
 const root={querySelector:selector=>({
  '.ai-matrix-v9':nodes.scene,
  '.ai-matrix-sr-v9':nodes.label
 })[selector]||null};
 let nextId=0;
 const timers=new Map();
 const setTimer=(fn,delay)=>{const id=++nextId;timers.set(id,{fn,delay});return id};
 const clearTimer=id=>timers.delete(id);
 const tick=delay=>{
  for(const [id,timer] of [...timers]){
   if(timer.delay===delay){timers.delete(id);timer.fn()}
  }
 };
 const result=new Function('ROOT','setTimeout','clearTimeout','chatBusyV4',
  helpers+'\nreturn {markup:aiDotMatrixMarkupV9,begin:aiBeginV9,finish:aiEndV9,cancel:aiCancelV9,state:()=>aiVisualStateV9,nonce:()=>aiRequestNonceV9};'
 )(root,setTimer,clearTimer,busy);
 return {...result,nodes,timers,tick};
}

test('idle orb is a real dot matrix: cube coordinates, sphere coordinates, and three working rings',()=>{
 const visual=harness();
 const markup=visual.markup();
 assert.equal(visual.state(),'start');
 assert.equal((markup.match(/class="ai-matrix-dot-v9"/g)||[]).length,96);
 assert.equal((markup.match(/class="ai-matrix-ring-dot-v9"/g)||[]).length,84);
 assert.equal((markup.match(/class="ai-matrix-ring-v9 /g)||[]).length,3);
 assert.match(markup,/--cx:/);
 assert.match(markup,/--sx:/);
 assert.match(markup,/--bx:/);
 assert.match(markup,/role="status"/);
 assert.match(markup,/Assistant ready/);
});

test('thinking, working, success and return to idle follow request lifecycle',()=>{
 const visual=harness();
 const ticket=visual.begin();
 assert.equal(visual.state(),'thinking');
 assert.equal(visual.nodes.label.textContent,'Assistant thinking');
 assert.ok([...visual.timers.values()].some(timer=>timer.delay===500));
 visual.tick(500);
 assert.equal(visual.state(),'working');
 assert.equal(visual.nodes.label.textContent,'Retrieving project information');
 visual.finish(ticket,true);
 assert.equal(visual.state(),'success');
 assert.equal(visual.nodes.label.textContent,'Assistant response ready');
 visual.tick(2200);
 assert.equal(visual.state(),'start');
 assert.equal(visual.timers.size,0);
});

test('failed request returns to idle and does not claim successful completion',()=>{
 const visual=harness();
 const ticket=visual.begin();
 visual.finish(ticket,false);
 assert.equal(visual.state(),'start');
 visual.tick(500);
 assert.equal(visual.state(),'start');
});

test('clear-chat, logout and other cancellation invalidate stale completion callbacks',()=>{
 const visual=harness();
 const first=visual.begin();
 visual.cancel();
 assert.equal(visual.state(),'start');
 visual.finish(first,true);
 visual.tick(500);
 visual.tick(2200);
 assert.equal(visual.state(),'start');
 const second=visual.begin();
 assert.ok(second>first);
 visual.finish(second,true);
 assert.equal(visual.state(),'success');
 visual.cancel();
 visual.tick(2200);
 assert.equal(visual.state(),'start');
});

test('frontend binds visual states to actual assistant request and resets',()=>{
 assert.match(app,/function logout\(refresh=true\)\{aiCancelV9\(\);/);
 assert.match(app,/if\(action==='clear'\)\{aiCancelV9\(\);/);
 assert.match(app,/chatBusyV4=true;const ticket=aiBeginV9\(\);render\(\);/);
 assert.match(app,/aiEndV9\(ticket,true\)/);
 assert.match(app,/aiEndV9\(ticket,false\)/);
 assert.match(app,/if\(ticket===aiRequestNonceV9\)\{chatBusyV4=false;render\(\);\}/);
 assert.match(app,/aiDotMatrixMarkupV9\(\)/);
 assert.doesNotMatch(app,/<div class="ai-orb-v4" aria-hidden="true">/);
});

test('all four animation states and reduced-motion preference exist',()=>{
 for(const name of ['start','thinking','working','success'])
  assert.ok(css.includes('[data-state="'+name+'"]'),'Missing visual state '+name);
 for(const animation of ['ai-v9-bubble','ai-v9-ring-x','ai-v9-ring-y','ai-v9-ring-angled','ai-v9-success-drift','ai-v9-success-aura'])
  assert.ok(css.includes(animation),'Missing animation '+animation);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/animation:none!important/);
});
