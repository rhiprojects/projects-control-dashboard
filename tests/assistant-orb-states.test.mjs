import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
const start=app.indexOf('let aiRequestNonceV9=0;');
const end=app.indexOf('function aiPanelV4(){',start);
assert.ok(start>=0&&end>start,'Simple SVG orb implementation must be present');
const helpers=app.slice(start,end);

const renderOrb=busy=>new Function('chatBusyV4',helpers+'return aiSimpleOrbV10();')(busy);

test('orb has 156 individually positioned SVG dots and sparse animated accents',()=>{
 const markup=renderOrb(false);
 const dots=[...markup.matchAll(/<circle class="ai-orb-dot-v10(?: ai-orb-spark-v10)?" cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)];
 assert.equal(dots.length,156);
 const sparkles=(markup.match(/class="ai-orb-dot-v10 ai-orb-spark-v10"/g)||[]).length;
 assert.ok(sparkles>=8&&sparkles<=16,'Keep accents sparse, not a flickering whole sphere');
 assert.match(markup,/<svg[^>]+viewBox="0 0 144 144"/);
 assert.match(markup,/class="ai-orb-rotate-v10"/);
 assert.match(markup,/Assistant ready/);
});

test('orb remains visibly spread even when transform and animation support is absent',()=>{
 const markup=renderOrb(false);
 const points=[...markup.matchAll(/<circle class="ai-orb-dot-v10(?: ai-orb-spark-v10)?" cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)];
 assert.equal(points.length,156);
 const x=points.map(m=>Number(m[1])),y=points.map(m=>Number(m[2]));
 assert.ok(Math.max(...x)-Math.min(...x)>=90,'Orb must occupy at least 90 viewBox units horizontally');
 assert.ok(Math.max(...y)-Math.min(...y)>=90,'Orb must occupy at least 90 viewBox units vertically');
 assert.ok(points.every(m=>Number(m[3])>0),'All dots have an explicit visible radius');
 assert.doesNotMatch(markup,/--cx:|--sx:|translate3d\(/);
});

test('continuous rotation and small individual pulses are CSS-only',()=>{
 assert.match(css,/\.ai-orb-rotate-v10\{[^}]*animation:ai-orb-turn-v10 19s linear infinite/);
 assert.match(css,/\.ai-orb-spark-v10\{[^}]*animation:ai-orb-pulse-v10 4\.4s/);
 assert.match(css,/@keyframes ai-orb-turn-v10/);
 assert.match(css,/@keyframes ai-orb-pulse-v10/);
 assert.doesNotMatch(css,/\.ai-matrix-v9|@keyframes ai-v9-/);
});

test('reduced-motion preference leaves the full sphere visible without animation',()=>{
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/\.ai-orb-rotate-v10,\.ai-orb-spark-v10\{[^}]*animation:none!important/);
 const markup=renderOrb(false);
 assert.match(markup,/class="ai-orb-dot-v10/);
});

test('assistant network logic and stale-request protection remain unchanged',()=>{
 assert.match(app,/if\(ticket!==aiRequestNonceV9\)return;/);
 assert.match(app,/if\(ticket===aiRequestNonceV9\)\{chatBusyV4=false;render\(\);\}/);
 assert.match(app,/function logout\(refresh=true\)\{aiCancelV9\(\);/);
 assert.match(app,/if\(action==='clear'\)\{aiCancelV9\(\);/);
 assert.match(app,/const ticket=aiBeginV9\(\);render\(\);/);
 assert.doesNotMatch(app,/aiEndV9|aiVisualSetV9|aiDotMatrixMarkupV9/);
});

test('busy state is announced accessibly without changing decorative animation',()=>{
 assert.match(renderOrb(true),/Assistant retrieving a response/);
 assert.match(renderOrb(false),/AI Assistant ready/);
 assert.match(renderOrb(true),/role="status" aria-live="polite"/);
});
