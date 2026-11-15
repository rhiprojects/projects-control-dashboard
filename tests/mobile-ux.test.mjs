import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');

const cssBlock=(section)=>{
 const at=css.lastIndexOf('/* Mobile portal UX');
 assert.ok(at>=0,'dedicated mobile polish styles must exist');
 return css.slice(at);
};

test('mobile timeline labels each budget month without removing the twelve-period model',()=>{
 assert.match(app,/data-month=['"]?/,'month labels must exist on timeline budget cells');
 assert.match(app,/Jan/,'January label retained');
 assert.match(app,/Dec/,'December period retained');
 const mobile=cssBlock();
 assert.match(mobile,/\.dashboard-timeline-grid\s*\{\s*min-width:\s*0/,'timeline must stop forcing a 795px canvas on phones');
 assert.match(mobile,/\.dashboard-timeline-cells\s*\{[^}]*grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)/,'months must form a six-column grid');
 assert.match(mobile,/\.dashboard-timeline-head\s*\{\s*display:\s*none/,'wide month header replaced with per-month labels');
});

test('narrow dashboard budget comparison draws horizontal categories without changing numeric series',()=>{
 assert.match(app,/const mobileBudget=/,'narrow budget mode must be explicit');
 assert.match(app,/horizontal=data\.kind==='horizontal'\|\|mobileBudget/,'budget series must switch to horizontal labels');
 assert.match(app,/mobileBudget\?[^;]*data\.labels\.length/,'mobile chart must scale its height by project count');
 assert.match(app,/name:'Approved Budget'/,'preserve approved series');
 assert.match(app,/name:'Working Budget'/,'preserve working series');
});

test('mobile header and assistant use touch-sized buttons and readable input font size',()=>{
 const mobile=cssBlock();
 assert.match(mobile,/\.topbar-ai button\s*\{[^}]*min-width:\s*44px/);
 assert.match(mobile,/\.topbar-ai button\s*\{[^}]*min-height:\s*44px/);
 assert.match(mobile,/\.topbar-ai input\s*\{[^}]*font-size:\s*16px/,'prevent iOS auto-zoom');
 assert.match(mobile,/\.ai-input-v4 button\s*\{[^}]*min-height:\s*44px/);
 assert.match(mobile,/\.ai-input-v4 input\s*\{[^}]*font-size:\s*16px/);
});

test('detailed financial tables remain fully scrollable and distinguish the leading project column',()=>{
 const mobile=cssBlock();
 assert.match(mobile,/\.table-wrap\.portal-table\s*\{[^}]*overflow-x:\s*auto/);
 assert.match(mobile,/\.table-wrap\.portal-table th:first-child/);
 assert.match(mobile,/position:\s*sticky/);
 assert.match(mobile,/\.table-wrap\.portal-table table\s*\{[^}]*min-width:\s*620px/);
});

test('mobile forms and navigation have comfortable controls without altering roles or API operations',()=>{
 const mobile=cssBlock();
 assert.match(mobile,/\.sidebar \.nav button\s*\{[^}]*min-height:\s*44px/);
 assert.match(mobile,/\.v4-formgrid input/);
 assert.match(mobile,/\.v4-formgrid select/);
 assert.match(mobile,/\.v4-formgrid textarea/);
 assert.match(mobile,/\.btn\.small\s*\{[^}]*min-height:\s*44px/);
 assert.match(app,/page==='team'&&lead\(\)/,'team access restriction must remain');
 assert.match(app,/async function login\(email,password\)/,'login remains unchanged');
});
