/* Projects Control v3.1 — Supabase-only; no demo users or fake permissions. */
'use strict';
const ROOT=document.getElementById('app');
const $=(s)=>document.querySelector(s);
const h=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v)=>v===null||v===undefined?'—':Number(v).toLocaleString('en-US',{maximumFractionDigits:2});
const val=(v)=>v===null||v===undefined?'—':h(v);
// Keep date-only contract dates as calendar dates; display timestamps in Cairo local time.
const PORTAL_TIME_ZONE='Africa/Cairo';
const cairoDateTime=now=>{
 const datePart=new Intl.DateTimeFormat('en-GB',{timeZone:PORTAL_TIME_ZONE,weekday:'short',day:'numeric',month:'long',year:'numeric'}).format(now);
 const timePart=new Intl.DateTimeFormat('en-GB',{timeZone:PORTAL_TIME_ZONE,hour:'2-digit',minute:'2-digit',hour12:true}).format(now);
 return datePart+' · '+timePart+' (Cairo)';
};
const cairoHour=()=>Number(new Intl.DateTimeFormat('en-GB',{timeZone:PORTAL_TIME_ZONE,hour:'2-digit',hourCycle:'h23'}).format(new Date()));
const cairoGreeting=name=>(cairoHour()<12?'Good Morning':cairoHour()<17?'Good Afternoon':'Good Evening')+' '+String(name||'').split(' ')[0];
const date=d=>{
 if(!d)return '—';
 if(/^\d{4}-\d{2}-\d{2}$/.test(String(d))){const [y,m,day]=String(d).split('-');return day+'/'+m+'/'+y;}
 const t=new Date(d);
 return Number.isNaN(t.getTime())?'—':new Intl.DateTimeFormat('en-GB',{timeZone:PORTAL_TIME_ZONE,day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true}).format(t)+' (Cairo)';
};
const roleName={super_admin:'Super Admin',head_of_projects:'Head of Projects',team_member:'Team Member'};
const iconPaths={"grid":"<rect x=\"3\" y=\"3\" width=\"7\" height=\"7\" rx=\"1\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\" rx=\"1\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"1\"/><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\" rx=\"1\"/>","projects":"<rect x=\"3\" y=\"5\" width=\"18\" height=\"15\" rx=\"2\"/><path d=\"M3 9h18M7 3v4\"/>","chart":"<path d=\"M4 20V11m6 9V4m6 16v-8m5 8H2\"/>","calendar":"<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M7 3v4m10-4v4M3 10h18\"/>","reports":"<path d=\"M6 3h10l4 4v14H6zM16 3v5h4M9 12h8M9 16h8\"/>","admin":"<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2m0-14-2 2M7 17l-2 2\"/>","assistant":"<path d=\"M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z\"/>","contract":"<path d=\"M6 3h10l4 4v14H6zM16 3v5h4M9 12h8M9 16h6\"/>","money":"<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M15 8c-1-2-6-2-6 1 0 3 6 1 6 5 0 3-5 4-7 1M12 5v14\"/>","progress":"<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v6m0 4h.01\"/>"};
const ico=name=>'<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(iconPaths[name]||iconPaths.grid)+'</svg>';
let dashboardV5=null,dashboardError=false,dashboardRequest=0;
let detailsError=false,detailsRequest=0,mobileNavOpen=false,creatingRequest=false;
const mobileNavMedia=window.matchMedia('(max-width: 780px)');
let cfg=null,auth=null,me=null,projects=[],adminData={users:[],assignments:[]},page='overview',chosen=null,edit=false,busy=false,error='',notice='',filter='',reportCode='all',question='',answer='';
const lead=()=>me?.role==='super_admin'||me?.role==='head_of_projects';
const admin=()=>me?.role==='super_admin';
const fromProject=(id)=>projects.find(p=>p.id===id)||null;
async function init(){
 try{const res=await fetch('/api/config',{cache:'no-store'});cfg=await res.json();}catch{error='Unable to reach the website API. Local functions must be running.';return render()}
 if(!cfg?.configured){error='Supabase connection has not been configured for this website. No real accounts or data are accessible yet.';return render()}
 try{const raw=sessionStorage.getItem('projectsControlSession');if(raw)auth=JSON.parse(raw);}catch{}
 if(auth){try{await ready()}catch(e){if([401,403].includes(e.status))logout(false);else error=e.message||'Unable to load projects';}}
 render();
}
const saveAuth=()=>{if(auth)sessionStorage.setItem('projectsControlSession',JSON.stringify(auth));else sessionStorage.removeItem('projectsControlSession')};
function logout(refresh=true){aiCancelV9();auth=null;me=null;projects=[];dashboardV5=null;dashboardError=false;++dashboardRequest;adminData={users:[],assignments:[]};page='overview';chosen=null;edit=false;chatV4=[];aiClarificationV4=null;clearProjectDetails();creatingV4=false;creatingRequest=false;mobileNavOpen=false;pendingV4=null;suggestionsV4={};saveAuth();if(refresh)render()}
async function refreshToken(){if(!auth?.refresh_token)return false;
 const r=await fetch(cfg.supabaseUrl+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:cfg.publishableKey,'content-type':'application/json'},body:JSON.stringify({refresh_token:auth.refresh_token})});
 if(!r.ok){logout(false);return false}auth=await r.json();saveAuth();return true;
}
async function api(url,{method='GET',body,retry=true}={}){
 if(!auth)throw Object.assign(new Error('Sign in required'),{status:401});
 if(auth.expires_at&&Date.now()/1000>auth.expires_at-45){if(!await refreshToken())throw Object.assign(new Error('Session expired'),{status:401})}
 const res=await fetch(url,{method,headers:{Authorization:`Bearer ${auth.access_token}`,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 if(res.status===401&&retry&&await refreshToken())return api(url,{method,body,retry:false});
 let obj={};try{obj=await res.json()}catch{}
 if(!res.ok)throw Object.assign(new Error(obj.error||`Request failed: ${res.status}`),{status:res.status});return obj;
}
async function login(email,password){
 const r=await fetch(cfg.supabaseUrl+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:cfg.publishableKey,'content-type':'application/json'},body:JSON.stringify({email,password})});
 let v={};try{v=await r.json()}catch{}
 if(!r.ok||!v.access_token)throw Error('Sign-in failed. Check your email, password and account activation.');
 aiCancelV9();chatV4=[];aiClarificationV4=null;detailsV4=null;pendingV4=null;auth=v;saveAuth();try{await ready()}catch(e){logout(false);throw e}
}
async function ready(){const s=await api('/api/session');me=s;const r=await api('/api/projects');projects=r.projects||[];if(admin())await loadAdmin();await loadDashboardV5();}
async function loadDashboardV5(){
 const request=++dashboardRequest;
 dashboardV5=null;dashboardError=false;render();
 try{
  const data=await api('/api/dashboard');
  if(request===dashboardRequest)dashboardV5=data;
 }catch{
  if(request===dashboardRequest)dashboardError=true;
 }
}
async function reload(){
 const account=me;
 const r=await api('/api/projects');
 if(me!==account)return;
 projects=r.projects||[];
 if(chosen&&!fromProject(chosen)){chosen=null;clearProjectDetails();}
 await loadDashboardV5();
 if(me!==account)return;
 if(admin())await loadAdmin();
 render();
}
async function loadAdmin(){
 const account=me,data=await api('/api/admin/users');
 if(me===account)adminData=data;
}
function setError(err){error=String(err?.message||err||'Unknown error');notice='';render()}
function showNotice(msg){error='';notice=msg;render()}
function loginView(){return `<div class="login-wrap"><section class="login-card"><div class="login-logo"><span class="brandmark">P</span><div class="brandname">Projects Control<small>SECURE MANAGEMENT PORTAL</small></div></div><h1 class="login-title">${cfg?.configured?'Welcome back':'Private configuration required'}</h1><p class="login-desc">${cfg?.configured?'Sign in to manage your projects.':'Please contact your administrator to configure sign-in.'}</p>${error?`<div class="error-box" role="alert">${h(error)}</div>`:''}${cfg?.configured?`<form id="login-form"><div class="login-field"><label for="email">Work email</label><input type="email" id="email" name="email" autocomplete="username" placeholder="name@company.com" required></div><div class="login-field"><label for="password">Password</label><input id="password" type="password" name="password" autocomplete="current-password" required></div><button class="btn primary login-button" type="submit">Secure sign in</button></form>`:`<div class="read-only-note">Please contact your administrator for account access.</div>`}</section></div>`}
const nav=[['overview','grid','Overview'],['projects','projects','Projects'],['financials','chart','Financials'],['milestones','calendar','Milestones'],['reports','reports','Reports'],['admin','admin','Administration']];
function layout(content){const name=h(me.displayName),today=cairoDateTime(new Date());
 return `<div class="app"><aside class="sidebar" id="workspace-sidebar"><button class="btn sidebar-close" type="button" data-action="close-menu">Close menu</button><div class="brand"><span class="brandmark">P</span><div class="brandname">Projects Control<small>MANAGEMENT PORTAL</small></div></div><span class="sidecaption">WORKSPACE</span><nav class="nav" aria-label="Workspace">${nav.filter(x=>x[0]!=='admin'||admin()).map(([key,icon,title])=>`<button class="${page===key?'active':''}" data-page="${key}"${page===key?' aria-current="page"':''}><span class="nav-icon">${ico(icon)}</span>${title}${key==='projects'?`<span class="num">${projects.length}</span>`:''}</button>`).join('')}</nav><div class="sidebottom"><span class="online"></span><strong>Secure session</strong><small>${name}<br>${h(roleName[me.role])}</small><button class="signout" data-action="logout">Sign out</button></div></aside><main class="main"><header class="topbar"><div class="breadcrumbs"><button class="btn mobile-menu" type="button" data-action="open-menu" aria-controls="workspace-sidebar" aria-expanded="false">Menu</button><span>Projects Control</span><span>›</span><strong>${h(nav.find(n=>n[0]===page)?.[2]||'Projects')}</strong></div><div class="topactions"><span class="topdate" data-cairo-clock>${h(today)}</span><span class="role-label">${h(roleName[me.role])}</span><span class="avatar">${h((me.displayName||'P').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase())}</span></div></header><div class="content">${error?`<div class="error-box" role="alert">${h(error)}</div>`:''}${notice?`<div class="okay-box" role="status">${h(notice)}</div>`:''}${content}</div></main></div>`}
const heading=(eye,title,subtitle,buttons='')=>`<div class="pageheader"><div><div class="eyebrow">${h(eye)}</div><h1 class="pagetitle">${h(title)}</h1><p class="subtitle">${h(subtitle)}</p></div><div class="meta-row no-print">${buttons}</div></div>`;
const kpi=(label,value,note,variant='',symbol='projects')=>`<div class="card kpi"><div class="kpi-top"><span class="kpi-label">${h(label)}</span><span class="kpi-icon ${variant}" aria-hidden="true">${ico(symbol)}</span></div><div class="kpi-value">${h(value)}</div><div class="kpi-note">${h(note)}</div></div>`;
const active=()=>projects.filter(p=>p.status==='Active');
function contractTotalLabel(currency){
 const recorded=active().filter(p=>p.contractCurrency===currency&&p.contractValue!==null);
 return recorded.length?fmt(recorded.reduce((sum,p)=>sum+p.contractValue,0)):'Not recorded';
}
const missing=(field)=>active().filter(p=>p[field]===null).length;
function projectCard(p){return `<div class="card projectcard"><div class="projecttop"><div><div class="projectid">Project ${h(p.id)}</div><h3 class="projectname">${h(p.displayName||p.client||p.name)}</h3><p class="projectclient">${h(p.name)}</p></div><span class="pill ${p.status==='Active'?'green':'neutral'}">${h(p.status||'Not supplied')}</span></div><div class="projectstats"><span>Contract Value</span><strong>${h(moneyLabel(p.contractValue,p.contractCurrency))}</strong><span>Project end</span><strong>${h(portalProjectEndText(p))}</strong></div><div class="projectfoot"><span>Physical progress: <strong>${p.progress===null?'Not Recorded':h(p.progress)+'%'}</strong></span><button class="btn small" data-project="${h(p.id)}">Open Project</button></div></div>`}
function syncMobileNav(focus){
 const sidebar=$('#workspace-sidebar'),trigger=$('.mobile-menu');
 if(!sidebar||!trigger)return;
 const narrow=mobileNavMedia.matches,open=narrow&&mobileNavOpen;
 sidebar.inert=narrow&&!open;
 sidebar.classList.toggle('open',open);
 trigger.setAttribute('aria-expanded',String(open));
 $('.main').inert=open;
 if(focus==='close')$('.sidebar-close').focus();
 if(focus==='trigger')trigger.focus();
}
function closeMobileNav(){
 mobileNavOpen=false;
 syncMobileNav('trigger');
}
mobileNavMedia.addEventListener('change',()=>{
 const focused=document.activeElement;
 const sidebar=$('#workspace-sidebar');
 mobileNavOpen=false;
 syncMobileNav(mobileNavMedia.matches&&sidebar?.contains(focused)?'trigger':null);
 if(!mobileNavMedia.matches&&focused?.matches('.mobile-menu,.sidebar-close')){
  $('.sidebar [aria-current="page"]')?.focus();
 }
});
ROOT.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&mobileNavOpen){event.preventDefault();closeMobileNav();}
});
function render(){
 const draft=creatingV4&&$('#create-v4');
 const focused=document.activeElement;
 if(window.echarts){
  ROOT.querySelectorAll('.v7-chart').forEach(el=>window.echarts.getInstanceByDom(el)?.dispose());
 }
 ROOT.innerHTML=!me?loginView():layout(creatingV4?createV4():chosen?(edit?editProjectV4():projectViewV4()):page==='overview'?overviewV4():page==='projects'?projectListV4():page==='financials'?financePageV4():page==='milestones'?milestonesPageV4():page==='reports'?reportPageV4():page==='admin'?adminPageV4():overviewV4());
 if(draft&&$('#create-v4')){
  $('#create-v4').replaceWith(draft);
  if(draft.contains(focused))focused.focus({preventScroll:true});
 }
 syncMobileNav(mobileNavOpen?'close':null);
 v7RenderCharts();
}
function focusPage(){
 const title=$('main h1');
 if(!title)return;
 title.tabIndex=-1;
 title.focus();
}
async function canLeaveCreate(){
 if(creatingRequest)return false;
 const form=$('#create-v4');
 if(!form)return true;
 const dirty=[...form.elements].some(field=>{
  if(field instanceof HTMLSelectElement)return [...field.options].some(option=>option.selected!==option.defaultSelected);
  if(field instanceof HTMLInputElement)return field.type==='file'?field.files.length>0:field.value!==field.defaultValue||field.validity.badInput;
  return false;
 });
 if(!dirty)return true;
 const dialog=$('#discard-project-draft');
 if(dialog.open)return false;
 dialog.returnValue='';
 return new Promise(resolve=>{
  dialog.addEventListener('close',()=>resolve(dialog.returnValue==='discard'),{once:true});
  dialog.showModal();
 });
}
function dataStatus(label,failed,retry){
 return `<section class="card panel v4-section data-status" data-load-state="${retry}" tabindex="-1">
 <h2 class="paneltitle">${h(label)}</h2>
 ${failed?`<p role="alert">Could not load this data.</p><button class="btn small" data-action="${retry}">Retry</button>`:'<p role="status">Loading…</p>'}</section>`;
}
function clearToast(){error='';notice=''}
ROOT.addEventListener('click',async e=>{
 const el=e.target.closest('button');if(!el)return;
 if(el.dataset.page){
  if(!await canLeaveCreate())return;
  creatingV4=false;chosen=null;clearProjectDetails();edit=false;page=el.dataset.page;filter='';clearToast();
  const closeMenu=mobileNavOpen;
  mobileNavOpen=false;render();
  if(closeMenu)syncMobileNav('trigger');else focusPage();
  return;
 }
 if(el.dataset.project){
  chosen=el.dataset.project;clearProjectDetails();edit=false;page='projects';clearToast();
  const loading=loadDetailsV4();render();focusPage();
  if(await loading){
   const onTitle=document.activeElement===$('main h1');
   render();
   if(onTitle)focusPage();
  }
  return;
 }
 const action=el.dataset.action;
 if(action==='open-menu'){mobileNavOpen=true;syncMobileNav('close');return;}
 if(action==='close-menu'){closeMobileNav();return;}
 if(action==='logout'){if(await canLeaveCreate())logout();return}
 if(action==='retry-dashboard'||action==='retry-details'){
  const loading=action==='retry-dashboard'?loadDashboardV5():loadDetailsV4();
  if(action==='retry-details')render();
  const state=()=>$(`[data-load-state="${action}"]`);
  state()?.focus({preventScroll:true});
  const account=me,project=chosen;
  await loading;
  if(me===account&&chosen===project){
   const restoreFocus=document.activeElement===state();
   render();
   if(restoreFocus){if(state())state().focus();else focusPage();}
  }else if(me===account&&action==='retry-dashboard')render();
  return;
 }
 if(action==='back'||action==='cancel'){chosen=null;edit=false;render();return}
 if(action==='edit'){edit=true;render();return}
 if(action==='print'){window.print();return}
 if(action==='email'){const ps=reportCode==='all'?projects:projects.filter(p=>p.id===reportCode);const plain=ps.map(p=>`${p.id} — ${p.client}\nContract value: ${fmt(p.contractValue)} ${p.contractCurrency||''}\nProgress: ${p.progress===null?'not supplied':p.progress+'%'}\n`).join('\n');location.href=`mailto:?subject=${encodeURIComponent('Projects Control report')}&body=${encodeURIComponent(plain.slice(0,4000)+'\nSource: Supabase project register. Financial transaction detail not connected.')}`;return}
 if(action==='reload'){
  const account=me;
  try{await reload();if(me===account)showNotice(dashboardError?'Project list refreshed. Dashboard data could not be loaded.':'Project data refreshed.');}
  catch(err){if(me===account)setError(err);}
  return;
 }
});
ROOT.addEventListener('input',e=>{if(e.target.id==='project-search'){filter=e.target.value;render();const inp=$('#project-search');if(inp){inp.focus();inp.setSelectionRange(filter.length,filter.length)}}});
ROOT.addEventListener('change',async e=>{
 if(e.target.id==='report-code'){reportCode=e.target.value;render();return}

});
ROOT.addEventListener('submit',async e=>{
 if(!['login-form','edit-form'].includes(e.target.id))return;e.preventDefault();clearToast();
 if(e.target.id==='login-form'){const f=new FormData(e.target);try{await login(String(f.get('email')||'').trim(),String(f.get('password')||''));render()}catch(err){setError(err)}return}
 
 if(e.target.id==='edit-form'){
  const p=fromProject(chosen);if(!p)return;
  const f=new FormData(e.target),changes={};
  for(const k of ['contractValue','progress']){const str=String(f.get(k)||'').trim();const next=str===''?null:Number(str);if(next!==p[k])changes[k]=next}
  const status=String(f.get('status')||'');if(status!==p.status)changes.status=status;
  if(!Object.keys(changes).length){edit=false;showNotice('No changes to save.');return}
  try{const response=await api('/api/projects/'+encodeURIComponent(p.id),{method:'PUT',body:{lastEdited:p.lastEdited,changes}});const index=projects.findIndex(q=>q.id===p.id);if(index>=0)projects[index]=response.project;edit=false;showNotice(response.warning||`Project ${p.id} updated in Supabase.`)}catch(err){setError(err)}
 }
});
let creatingV4=false, detailsV4=null, chatV4=[],chatBusyV4=false,aiClarificationV4=null,pendingV4=null,suggestionsV4={};
// v10: simple, always-visible SVG dot globe. Positions are SVG coordinates,
// not CSS transforms; the globe remains visible when motion is unavailable.
let aiRequestNonceV9=0;
function aiCancelV9(){++aiRequestNonceV9;chatBusyV4=false;}
function aiBeginV9(){return ++aiRequestNonceV9;}
function aiSimpleOrbV10(){
 const N=156,center=72,radius=49,goldenAngle=Math.PI*(3-Math.sqrt(5));
 const dots=[];
 for(let i=0;i<N;i++){
  const depth=1-2*(i+.5)/N;
  const ringRadius=Math.sqrt(1-depth*depth);
  const theta=i*goldenAngle;
  const x=center+Math.cos(theta)*ringRadius*radius;
  const y=center+Math.sin(theta)*ringRadius*radius;
  const brightness=(depth+1)/2;
  const r=(0.75+0.70*brightness).toFixed(2);
  const op=(.30+.64*brightness).toFixed(2);
  const sparkle=i%13===0;
  const delay=-(i%17)*.41;
  dots.push('<circle class="ai-orb-dot-v10'+(sparkle?' ai-orb-spark-v10':'')+
   '" cx="'+x.toFixed(2)+'" cy="'+y.toFixed(2)+'" r="'+r+
   '" fill="'+(brightness>.48?'#3A4061':'#7B88B6')+
   '" opacity="'+op+'"'+(sparkle?' style="--spark-delay:'+delay.toFixed(2)+'s;--base-opacity:'+op+'"':'')+' />');
 }
 return '<div class="ai-orb-v10" aria-hidden="true"><svg class="ai-orb-svg-v10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144" focusable="false"><g class="ai-orb-rotate-v10">'+dots.join('')+'</g></svg></div>'+
 '<span class="ai-orb-status-v10" role="status" aria-live="polite">'+(chatBusyV4?'Assistant retrieving a response':'AI Assistant ready')+'</span>';
}

function aiPanelV4(){
 const topics=[["Projects","How many projects can I access?"],["Financials","What are my projects' 2027 budgets?"],["Progress","What is the latest physical progress of my projects?"],["Contracts","What contract details are available?"],["Dates","When are my projects scheduled to finish?"],["Owners","Who is responsible for my projects?"]];
 return `<section class="card ai-card-v4"><div class="ai-top-v4"><h2>AI Assistant</h2><button type="button" title="Clear Chat" aria-label="Clear Chat" class="ai-menu-v4" data-v4="clear">⋮</button></div>${aiSimpleOrbV10()}<h3 class="ai-heading-v4">What Can I Help With?</h3><div class="ai-topics-v4">${topics.map(([label,question])=>`<button type="button" data-v4="prompt" data-question="${h(question)}">${label}</button>`).join("")}</div>${chatV4.length?`<div class="ai-chat-v4">${chatV4.map(x=>`<p class="${x.role==='user'?'my-question':''}">${h(x.content)}</p>`).join('')}</div>`:''}${aiClarificationV4?.kind==='loss_basis'?`<div class="ai-topics-v4" aria-label="Choose how to define loss"><button type="button" data-v4="clarify" data-choice="Gross loss">Gross loss</button><button type="button" data-v4="clarify" data-choice="Net loss">Net loss</button><button type="button" data-v4="clarify" data-choice="Both">Both</button></div>`:''}<form id="ai-v4" class="ai-input-v4"><span aria-hidden="true">✣</span><input aria-label="Ask the AI Assistant" name="question" placeholder="Ask anything about your projects..." maxlength="1600" required><button ${chatBusyV4?'disabled':''}>↑ Send</button></form></section>`;
}


const v5Number=x=>x===null||x===undefined||x===''?null:(Number.isFinite(Number(x))?Number(x):null);
const moneyLabel=(amount,currency)=>amount==null?'Not recorded':fmt(amount)+(currency?' '+currency:'');
const moneyHeading=(label,currency)=>h(label+(currency?' · '+currency:''));
const v5Money=(amount,currency)=>h(moneyLabel(amount,currency));
function categoryBar(amount,maximum){
 const width=Math.max(0,Math.min(100,amount/maximum*100));
 return `<svg class="v5-track" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect width="${width}" height="10"></rect></svg>`;
}
const v5Rows=id=>(dashboardV5.budgetLines||[]).filter(x=>x.project_code===id&&String(x.period_start).startsWith('2027-'));
const v7MonthlyBudget=id=>(dashboardV5.monthlyBudgets||[]).filter(x=>x.project_code===id&&String(x.period_start).startsWith('2027-')).sort((a,b)=>String(a.period_start).localeCompare(String(b.period_start)));
const v7BudgetCurrency=id=>v7MonthlyBudget(id).find(x=>v5Number(x.baseline_amount)!==null&&Number(x.baseline_amount)!==0)?.currency||v7MonthlyBudget(id)[0]?.currency||null;
const v7Total=(rows,key)=>{const valid=rows.filter(x=>v5Number(x[key])!==null);return valid.length?valid.reduce((n,x)=>n+Number(x[key]),0):null;};

function portalProjectEnd(p){
 if(!p)return null;
 const recorded=p.forecastFinish||p.baselineFinish;
 if(recorded)return {month:String(recorded).slice(0,7),label:recorded,source:p.forecastFinish?'Manager-updated forecast':'Recorded planned finish'};
 if(!dashboardV5)return null;
 const funded=(dashboardV5.monthlyBudgets||[]).filter(x=>x.project_code===p.id&&String(x.period_start).startsWith('2027-')&&v5Number(x.baseline_amount)!==null&&Number(x.baseline_amount)!==0);
 const month=funded.reduce((latest,x)=>{const m=String(x.period_start).slice(0,7);return m>latest?m:latest;},'');
 if(!month)return null;
 return {month,label:new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T00:00:00Z')),source:'2027 approved budget; exact day not recorded'};
}
function portalProjectEndText(p){
 const end=portalProjectEnd(p);
 return end?end.label+(end.source==='2027 approved budget; exact day not recorded'?' (budget month; day not recorded)':''):'Not recorded';
}
function portalScheduledMonths(p,rows){
 const end=portalProjectEnd(p);
 if(!end)return rows;
 return rows.filter(x=>String(x.period_start).slice(0,7)<=end.month||
  [x.baseline_amount,x.current_amount].some(value=>v5Number(value)!==null&&Number(value)!==0));
}
function portalOutsideManpower(p){
 const end=portalProjectEnd(p);
 if(!end||!dashboardV5)return '';
 const items=(dashboardV5.budgetLines||[]).filter(x=>x.project_code===p.id&&x.category==='Manpower'&&
  String(x.period_start).slice(0,7)>end.month&&v5Number(x.baseline_amount)!==null&&Number(x.baseline_amount)!==0);
 if(!items.length)return '';
 const periods=[...new Set(items.map(x=>String(x.period_start).slice(0,7)))].sort();
 return '<p class="v5-context" role="note">Manpower reference costs exist after the current project end ('+h(periods.join(', '))+'). These source rows remain for audit and are not part of the approved monthly project budget. Reconciliation is required; no amount has been reassigned.</p>';
}
function v5Health(id,currency){
 const rows=(dashboardV5.actuals||[]).filter(x=>x.project_code===id&&x.currency===currency);
 const revenue=rows.filter(x=>String(x.account_name).trim().toLowerCase()==='revenue');
 const cogs=rows.filter(x=>String(x.account_name).trim().toLowerCase()==='cogs');
 if(!revenue.length||!cogs.length||rows.some(x=>v5Number(x.amount)===null))return null;
 const margin=revenue.reduce((n,r)=>n+Number(r.amount),0)-cogs.reduce((n,r)=>n+Number(r.amount),0);
 return {margin,direction:margin>=0?'up':'down'};
}
function v5Arrow(p){
 const result=v5Health(p.id,p.contractCurrency);
 const explanation=result?'Recorded Revenue minus COGS: '+moneyLabel(result.margin,p.contractCurrency)+'. The arrow indicates the sign of the recorded margin.':'Recorded margin unavailable: Revenue and COGS actuals are required in the contract currency.';
 return '<span class="financial-margin"><span class="v5-trend '+(result?result.direction:'unavailable')+'" title="'+h(explanation)+'" aria-label="'+h(explanation)+'">'+(result?(result.direction==='up'?'↗':'↘'):'—')+'</span><small>'+(result?'Recorded margin':'Margin unavailable')+'</small></span>';
}
function financialTable(caption,columns,rows){
 const headers=columns.map((column,i)=>
  '<th scope="col"'+(i?' class="financial-number"':'')+'>'+h(column)+'</th>'
 ).join('');
 const body=rows.map(row=>'<tr>'+row.map((value,i)=>
  (i?'<td class="financial-number">':'<th scope="row">')+h(value)+(i?'</td>':'</th>')
 ).join('')+'</tr>').join('');
 return '<div class="table-wrap financial-table" role="region" aria-label="'+h(caption)+
  '" tabindex="0"><table><caption>'+h(caption)+'</caption><thead><tr>'+headers+
  '</tr></thead><tbody>'+body+'</tbody></table></div>';
}
function marginContext(p){
 const rows=(dashboardV5.actuals||[]).filter(x=>x.project_code===p.id&&x.currency===p.contractCurrency);
 const missing=['Revenue','COGS'].filter(name=>!rows.some(x=>String(x.account_name).trim().toLowerCase()===name.toLowerCase()));
 if(missing.length)return 'Insufficient actual data. '+missing.join(' and ')+' actuals are not recorded in '+(p.contractCurrency||'the contract currency')+'.';
 if(rows.some(x=>v5Number(x.amount)===null))return 'Insufficient actual data. Some recorded actual amounts are missing.';
 return 'Recorded margin is Revenue minus COGS across available records in the contract currency. It is not a historical trend or a validated profit/loss statement. Periods and accounts are listed in Historical P&L Actuals.';
}
/* v7: Presentation-only ECharts. Existing records and tables remain authoritative. */
let v7ChartsPromise=null;
function v7Chart(title,kind,labels,series,currency='',options={}){
 if(!labels.length||!series.length)return options.table?'<section class="v7-chart-panel financial-chart-panel"><h3>'+h(title)+'</h3><p class="financial-note">No approved budget amounts recorded for this chart.</p>'+options.table+'</section>':'';
 const isHorizontal=kind==='horizontal';
 const {financial=false,table='',...chartOptions}=options;
 const payload=JSON.stringify({kind,labels,series,currency,financial,...chartOptions});
 const exact=financial?(table||financialTable(title+' — exact values',
  ['Period / Category',...series.map(x=>x.name)],
  labels.map((label,i)=>[label,...series.map(x=>moneyLabel(x.values[i],currency))]))):'';
 const chartHeight=isHorizontal?' style="height:'+Math.max(265,140+labels.length*56)+'px"':'';
 return '<div class="v7-chart-panel'+(isHorizontal?' v7-team-chart-panel':'')+(financial?' financial-chart-panel':'')+'"><h3>'+h(title)+'</h3><div class="v7-chart'+(isHorizontal?' v7-chart-horizontal':'')+'"'+chartHeight+' role="img" aria-label="'+h(title+(financial?'. Recorded budget values by category. Exact amounts are available in the following table.':''))+'" data-chart="'+h(payload)+'"></div><p class="v7-chart-note">'+(isHorizontal?'Each bar shows directly assigned projects. Counts are not hours or utilization.':financial?'Budget figures are forecasts. Not recorded indicates a missing value; 0 indicates a recorded zero. Exact values follow.':'Values reflect available records only. Refer to the table for exact figures.')+'</p>'+exact+'</div>';
}
function v7LoadCharts(){
 if(window.echarts)return Promise.resolve(window.echarts);
 if(v7ChartsPromise)return v7ChartsPromise;
 v7ChartsPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js';
  script.onload=()=>window.echarts?resolve(window.echarts):reject(Error('Charts unavailable'));
  script.onerror=()=>reject(Error('Charts unavailable'));
  document.head.appendChild(script);
 }).catch(e=>{v7ChartsPromise=null;throw e});
 return v7ChartsPromise;
}
async function v7RenderCharts(){
 const targets=[...ROOT.querySelectorAll('.v7-chart')];
 if(!targets.length)return;
 let echarts;
 try{echarts=await v7LoadCharts()}catch(e){targets.forEach(el=>{if(el.isConnected)el.textContent='Chart unavailable; detailed figures remain accessible in the tables.'});return;}
 targets.forEach(el=>{
  if(!el.isConnected)return;
  try{
   const data=JSON.parse(el.dataset.chart);
   const chart=echarts.init(el,null,{renderer:'svg'});
   const horizontal=data.kind==='horizontal';
   const totalProjects=Math.max(1,Number(data.maxProjects)||0);
   const colors=['#3A4061','#7B88B6','#B3C0DD'];
   const option={
    animation:false,
    color:colors,
    textStyle:{color:'#3A4061'},
    tooltip:{
     trigger:'axis',backgroundColor:'#F4F6FB',borderColor:'#B3C0DD',
     textStyle:{color:'#3A4061'},
     axisPointer:{lineStyle:{color:'#B3C0DD'},shadowStyle:{color:'#DBE2F2'}},
     valueFormatter:v=>v==null?'Not recorded':Number(v).toLocaleString('en-US',{maximumFractionDigits:2})+(data.currency?' '+data.currency:'')
    },
    legend:{top:0,type:'scroll',textStyle:{color:'#3A4061'}},
    grid:horizontal?{left:24,right:32,top:48,bottom:42,containLabel:true}:{left:16,right:22,top:48,bottom:48,containLabel:true},
    xAxis:horizontal?{
     type:'value',min:0,max:totalProjects,interval:1,minInterval:1,
     name:'Projects',nameLocation:'middle',nameGap:28,
     axisLabel:{color:'#3A4061',formatter:value=>Number.isInteger(value)?String(value):''},
     splitLine:{lineStyle:{color:'#DBE2F2'}}
    }:{
     type:'category',data:data.labels,axisLabel:{hideOverlap:!data.financial,color:'#3A4061',rotate:data.financial?35:0,...(data.financial?{width:90,overflow:'break'}:{})},
     axisLine:{lineStyle:{color:'#B3C0DD'}}
    },
    yAxis:horizontal?{
     type:'category',data:data.labels,inverse:true,
     axisLabel:{color:'#3A4061',fontSize:12,margin:16},
     axisTick:{show:false},axisLine:{lineStyle:{color:'#B3C0DD'}}
    }:{
     type:'value',name:data.financial?data.currency:'',axisLabel:{formatter:v=>Number(v).toLocaleString('en-US',{maximumFractionDigits:2}),color:'#3A4061'},
     splitLine:{lineStyle:{color:'#DBE2F2'}}
    },
    series:data.series.map((x,i)=>({
     name:x.name,type:data.kind==='line'?'line':'bar',data:x.values,smooth:false,
     barMaxWidth:horizontal?32:36,itemStyle:{color:colors[i%colors.length],
      ...(data.financial&&i===1?{decal:{symbol:'rect',dashArrayX:[1,0],dashArrayY:[2,4],color:'#3A4061'}}:{})}
    }))
   };
   chart.setOption(option);
   if(typeof ResizeObserver==='function'){
    const observer=new ResizeObserver(()=>{if(el.isConnected)chart.resize();else{observer.disconnect();chart.dispose()}});
    observer.observe(el);
   }
  }catch(e){el.textContent='Chart unavailable; detailed figures remain accessible in the tables.';}
 });
}

function v5FinancialPanel(p){
 const contractCurrency=p.contractCurrency;
 const allMonths=v7MonthlyBudget(p.id),currency=v7BudgetCurrency(p.id);
 const months=portalScheduledMonths(p,allMonths.filter(x=>x.currency===currency));
 const approved=v7Total(months,'baseline_amount'),working=v7Total(months,'current_amount');
 const included=new Set(months.filter(x=>v5Number(x.baseline_amount)!==null&&Number(x.baseline_amount)!==0).map(x=>String(x.period_start).slice(0,7)));
 const lines=v5Rows(p.id).filter(x=>x.currency===currency&&included.has(String(x.period_start).slice(0,7)));
 const valid=lines.filter(x=>v5Number(x.baseline_amount)!==null);
 const categories=[...new Set(valid.map(x=>x.category))];
 const totals=categories.map(category=>({category,amount:valid.filter(x=>x.category===category).reduce((n,x)=>n+Number(x.baseline_amount),0)}));
 const maximum=Math.max(1,...totals.map(x=>x.amount));
 const health=v5Health(p.id,contractCurrency);
 const categoriesReconcile=months.filter(x=>included.has(String(x.period_start).slice(0,7))).every(m=>{
   const matching=valid.filter(x=>String(x.period_start).slice(0,7)===String(m.period_start).slice(0,7));
   return matching.length>0&&Math.abs(matching.reduce((n,x)=>n+Number(x.baseline_amount),0)-Number(m.baseline_amount))<0.01;
 });
 const categoriesAvailable=valid.length>0&&categoriesReconcile;
 const note=categoriesAvailable?'Category values reconcile with approved monthly budgets for the included scheduled months. These are budgeted reference costs.':'Category comparisons are withheld because the reference lines do not establish a reconciled breakdown of the scheduled monthly budget. The approved and working monthly budgets remain available below.';
 return '<section class="card panel v4-section v5-financial" aria-label="Financial analysis"><h2 class="paneltitle">Project Financial Analysis</h2><p class="v5-context">Current project end: '+h(portalProjectEndText(p))+'. Original Contract Value is contractual and has no annual reporting period here. Approved and Working Project Budgets cover the available 2027 monthly records and include manpower and other costs. These measures retain their own currencies and do not establish actual revenue, incurred expenditure, or profit.</p>'+portalOutsideManpower(p)+
 '<div class="v5-metrics"><div><small>'+moneyHeading('Original Contract Value',contractCurrency)+'</small><strong>'+v5Money(p.contractValue,contractCurrency)+'</strong><p class="financial-note">Contractual amount</p></div><div><small>'+moneyHeading('2027 Approved Project Budget',currency)+'</small><strong>'+v5Money(approved,currency)+'</strong><p class="financial-note">Approved forecast · 2027</p></div><div><small>'+moneyHeading('2027 Working Project Budget',currency)+'</small><strong>'+v5Money(working,currency)+'</strong><p class="financial-note">Working forecast · 2027</p></div><div><small>'+moneyHeading('Recorded P&L Margin',contractCurrency)+'</small><strong>'+v5Money(health?.margin??null,contractCurrency)+'</strong><p class="financial-note">Available recorded periods</p></div></div><p class="financial-note">'+h(marginContext(p))+'</p>'+
 v7Chart('2027 Monthly Project Budget — Approved vs Working'+(currency?' · '+currency:''),'bar',months.map(x=>String(x.period_start).slice(0,7)),[{name:'Approved Budget',values:months.map(x=>v5Number(x.baseline_amount))},{name:'Working Budget',values:months.map(x=>v5Number(x.current_amount))}],currency,{financial:true})+
 (categoriesAvailable?v7Chart('2027 Scheduled Costs By Category'+(currency?' · '+currency:''),'bar',totals.map(x=>x.category),[{name:'Scheduled Costs',values:totals.map(x=>x.amount)}],currency,{financial:true}):'')+
 '<p class="v5-context">'+h(note)+'</p>'+
 '<div class="v5-analysis-grid"><div><h3>Scheduled Costs By Category</h3><p class="v5-context">Budgeted reference costs for included scheduled months. Bar lengths are relative to the largest category; exact amounts are labeled.</p>'+
 (categoriesAvailable?totals.map(x=>'<div class="v5-bar-row"><div><span>'+h(x.category)+'</span><strong>'+fmt(x.amount)+' '+h(currency)+'</strong></div>'+categoryBar(x.amount,maximum)+'</div>').join(''):'<p>Category amounts are withheld pending reconciliation with the scheduled monthly budget.</p>')+
 '</div><div><h3>2027 Monthly Project Budget</h3>'+(months.length?'<div class="table-wrap"><table><thead><tr><th>Month</th><th>Approved</th><th>Working</th></tr></thead><tbody>'+months.map(x=>'<tr><td>'+h(String(x.period_start).slice(0,7))+'</td><td>'+v5Money(v5Number(x.baseline_amount),currency)+'</td><td>'+v5Money(v5Number(x.current_amount),currency)+'</td></tr>').join('')+'</tbody></table></div>':'<p>No 2027 monthly project budget recorded.</p>')+'</div></div></section>';
}
function v5TeamPanel(){
 if(!lead())return '';
 // Only actual active team members appear here; Head of Projects is the manager,
 // and the full accessible portfolio sets the chart scale, not a manager bar.
 const people=(dashboardV5.people||[]).filter(u=>u.active&&u.role==='team_member')
  .sort((a,b)=>String(a.display_name||'').localeCompare(String(b.display_name||'')));
 const visibleCodes=[...new Set(projects.map(p=>p.id))];
 const accessible=new Set(visibleCodes);
 const assignments=(dashboardV5.assignments||[]).filter(a=>accessible.has(a.project_code));
 const members=people.map(u=>{
  const codes=[...new Set(assignments.filter(a=>a.user_id===u.id).map(a=>a.project_code))];
  return {name:u.display_name,codes};
 });
 return '<section class="card panel v4-section v8-team-section"><h2 class="paneltitle">Team Workload</h2>'+
 '<p class="v5-context">Direct project assignments for active team members. The chart scale covers all '+accessible.size+' projects accessible to the Head of Projects; counts are not hours or utilization.</p>'+
 (members.length?'<div class="v8-team-layout"><div class="v8-team-graph">'+
 v7Chart('Assigned Projects By Team Member','horizontal',members.map(x=>x.name),
 [{name:'Assigned Projects',values:members.map(x=>x.codes.length)}],'',{maxProjects:accessible.size})+
 '</div><div class="v8-team-members"><h3>Team Members</h3><div class="v8-team-roster">'+
 members.map(u=>'<div class="v8-member-item"><div class="v8-member-top"><strong>'+h(u.name)+'</strong><span class="v8-member-count">'+u.codes.length+' project'+(u.codes.length===1?'':'s')+'</span></div><div class="v8-member-codes"><span>Project codes</span><strong>'+h(u.codes.join(', ')||'None assigned')+'</strong></div></div>').join('')+
 '</div></div></div>':'<p>No active team members are available.</p>')+'</section>';
}
function v5Portfolio(){
 const currencies=[...new Set(active().map(p=>v7BudgetCurrency(p.id)).filter(Boolean))];
 const charts=currencies.map(currency=>{
  const labels=[],values=[];
  active().filter(p=>v7BudgetCurrency(p.id)===currency).forEach(p=>{
   const total=v7Total(v7MonthlyBudget(p.id).filter(x=>x.currency===currency),'baseline_amount');
   if(total!==null){labels.push(p.id);values.push(total);}
  });
  const exactRows=active().filter(p=>v7BudgetCurrency(p.id)===currency).map(p=>{
   const months=portalScheduledMonths(p,v7MonthlyBudget(p.id).filter(x=>x.currency===currency));
   return [p.id+' · '+(p.displayName||p.client),moneyLabel(v7Total(months,'baseline_amount'),currency),
    moneyLabel(v7Total(months,'current_amount'),currency),moneyLabel(p.contractValue,p.contractCurrency),portalProjectEndText(p)];
  });
  return v7Chart('2027 Approved Project Budget by Project · '+currency,'bar',labels,[{name:'Approved Project Budget',values}],currency,
   {financial:true,table:financialTable('2027 project budgets · '+currency+'; original contract values in their own currencies',
    ['Project','Approved Project Budget','Working Project Budget','Original Contract Value','Project end'],exactRows)});
 }).join('');
 return charts+'<section class="card panel v4-section"><div class="panelhead"><h2 class="paneltitle">Project Financial Overview</h2></div><p class="v5-context">2027 project budgets are forecasts grouped by budget currency. Original contract values retain their contractual currencies. Margin arrows indicate the sign of recorded Revenue minus COGS in the contract currency; they do not show a trend. Unavailable actuals remain neutral.</p><div class="v5-portfolio-grid">'+active().map(p=>{
  const currency=v7BudgetCurrency(p.id);
  const months=portalScheduledMonths(p,v7MonthlyBudget(p.id).filter(x=>x.currency===currency));
  const total=v7Total(months,'baseline_amount'),working=v7Total(months,'current_amount');
  return '<div class="v5-portfolio-item"><div><strong>'+h(p.id)+' · '+h(p.displayName||p.client)+'</strong>'+v5Arrow(p)+'</div><small>'+moneyHeading('2027 Approved Project Budget',currency)+'</small><strong>'+v5Money(total,currency)+'</strong><small>'+moneyHeading('2027 Working Project Budget',currency)+'</small><strong>'+v5Money(working,currency)+'</strong><small>'+moneyHeading('Original Contract Value',p.contractCurrency)+'</small><strong>'+v5Money(p.contractValue,p.contractCurrency)+'</strong><small>Current project end</small><strong>'+h(portalProjectEndText(p))+'</strong><button class="btn small" data-project="'+h(p.id)+'">View Financial Analysis</button></div>';
 }).join('')+'</div>'+(!active().length?'<p>No active project records available.</p>':'')+'</section>';
}

function overviewV4(){
 return heading("Overview",me.role==="head_of_projects"?cairoGreeting(me.displayName):`Welcome, ${me.displayName.split(' ')[0]}`,"Your projects at a glance.",'<button class="btn" data-action="reload">↻ Refresh</button>')+
 `<div class="cards">${kpi('Active Projects',String(active().length),'Active Projects','','projects')}${kpi('Original Contract Value · EGP',contractTotalLabel('EGP'),'Active projects · contractual amounts','blue','contract')}${kpi('Original Contract Value · USD',contractTotalLabel('USD'),'Active projects · contractual amounts','','money')}${kpi('Progress Not Recorded',String(missing('progress')),'Active Projects','amber','progress')}</div><div class="grid-two v4-grid"><section class="card panel"><div class="panelhead"><h2 class="paneltitle">Your Active Projects</h2><button class="btn small" data-page="projects">View all</button></div><ul class="list-naked">${active().map(p=>`<li><div><button class="plink" data-project="${h(p.id)}">${h(p.id)} · ${h(p.displayName||p.client)}</button><span class="subline">${h(p.status)} · ${h(p.contractCurrency)} · End: ${h(portalProjectEndText(p))}</span></div>${dashboardV5?v5Arrow(p):''}</li>`).join('')}</ul></section>${aiPanelV4()}</div>${dashboardV5?v5TeamPanel()+v5Portfolio():dataStatus('Dashboard data',dashboardError,'retry-dashboard')}`;
}

function createV4(){
 const fields=[['projectCode','Project code','text'],['client','Client / contracting organization','text'],['scope','Project scope','text'],['contractValue','Contract value','number'],['location','Location','text'],['startDate','Planned start','date'],['baselineFinish','Planned finish','date'],['forecastFinish','Forecast finish','date'],['durationMonths','Duration (months)','number']];
 return heading('Projects','Create New Project','Enter project information and attach files.')+
 `<section class="card panel"><form id="create-v4"><div class="v4-formgrid">${fields.map(([name,label,type])=>`<label>${label}<input name="${name}" type="${type}" ${['projectCode','client','scope'].includes(name)?'required':''} ${type==='number'?'min="0" step="0.01"':''}></label>`).join('')}<label>Currency<select name="currency"><option selected>EGP</option><option>USD</option><option>EUR</option><option>Other</option></select></label><label>Contract file (PDF or Word)<input name="contract" type="file" accept=".pdf,.doc,.docx"></label><label>Project Numbers (Excel, PDF or Word)<input id="numbers-precreate-v4" name="numbers" type="file" accept=".xls,.xlsx,.pdf,.doc,.docx"></label></div><div id="numbers-proposal-v4" class="v4-proposal" hidden></div><div class="form-actions"><button class="btn" type="button" data-v4="cancel-create">Cancel</button><button class="btn primary">Create project</button></div></form></section>`;
}

function projectViewV4(){
 const p=fromProject(chosen);if(!p)return projectListV4();const d=detailsV4;
 const line=(label,value)=>`<div class="v4-fact"><span>${label}</span><strong>${h(String(value??'Not recorded'))}</strong></div>`;
 const owner=p.internalOwnerId===me.userId?me.displayName:!p.internalOwnerId?'Not assigned':
   d?.people?.find(u=>u.id===p.internalOwnerId)?.display_name||(d||detailsError?'Unavailable':'Loading…');
 return heading('Projects',`${h(p.id)} · ${h(p.displayName||p.client)}`,h(p.scope||''),`<button class="btn" data-v4="back">Back</button><button class="btn primary" data-v4="edit"${!d?' disabled':''}>Edit Project</button>`)+
 `<section class="card panel v4-section"><h2 class="paneltitle">Project Information</h2><div class="v4-facts">${line('Internal owner',owner)}${line('Client / contracting organization',p.client)}${line('Contract value',moneyLabel(p.contractValue,p.contractCurrency))}${line('Physical progress',p.progress===null?'Not recorded':p.progress+'%')}${line('Location',p.location)}${line('Start date',p.startDate)}${line('Current project end',portalProjectEndText(p))}${line('Planned finish',p.baselineFinish)}${line('Forecast finish',p.forecastFinish)}${line('Duration (months)',p.durationMonths)}</div></section>
 ${d?projectTeamV4(d):dataStatus('Project details',detailsError,'retry-details')}
 ${dashboardV5?v5FinancialPanel(p):dataStatus('Project financial analysis',dashboardError,'retry-dashboard')}
 ${d?projectRecordsV4(d):''}`;
}

function projectTeamV4(d){
 return lead()?`<section class="card panel v4-section"><h2 class="paneltitle">Project Team</h2>
 <div class="v4-file">${(d?.assignments||[]).map(a=>h((d?.people||[]).find(u=>u.id===a.user_id)?.display_name||'Assigned employee')).join(', ')||'No team members assigned.'}</div>
 <form id="assign-v4" class="v4-inline"><label>Assign Team Member
 <select name="userId" required><option value="">Select employee</option>${(d?.people||[]).filter(u=>u.role==='team_member'&&!(d?.assignments||[]).some(a=>a.user_id===u.id)).map(u=>`<option value="${h(u.id)}">${h(u.display_name)}</option>`).join('')}</select></label>
 <button class="btn" type="submit">Assign</button></form></section>`:'';
}

function projectRecordsV4(d){
 const {monthly:allMonthly=[],lines=[],actuals=[],documents:docs=[],history=[]}=d;
 const totals=portalScheduledMonths(fromProject(chosen),allMonthly);
 return `<section class="card panel v4-section"><h2 class="paneltitle">Monthly Budget</h2>${totals.length?`<div class="table-wrap"><table><thead><tr><th>Period</th><th>Currency</th><th>Approved</th><th>Working budget</th><th></th></tr></thead><tbody>${totals.map(r=>`<tr><td>${h(r.period_start)}</td><td>${h(r.currency)}</td><td>${fmt(r.baseline_amount===null?null:Number(r.baseline_amount))}</td><td><input class="v4-amount" data-money="monthly-${h(r.period_start)}" type="number" step="0.01" value="${r.current_amount??''}"></td><td><button class="btn small" data-v4="save-money" data-kind="monthly" data-entry="${h(r.period_start)}" data-updated="${h(r.updated_at)}">Save</button></td></tr>`).join('')}</tbody></table></div>`:'<p>No budget entered.</p>'}<form id="add-period-v4" class="v4-inline"><label>Add month or year <input type="month" name="period" required></label><button class="btn">Add month</button></form></section>
 <section class="card panel v4-section"><h2 class="paneltitle">Detailed Budget &amp; COGS</h2><p class="v5-context">Full-year reference cost lines may extend beyond scheduled project budget months. The 2027 Monthly Project Budget above follows the current project end. Source cost lines outside that period remain visible for audit but do not automatically extend the approved budget.</p>${lines.length?`<details><summary>View ${lines.length} budget entries</summary><div class="table-wrap v4-scroll"><table><thead><tr><th>Period</th><th>Category</th><th>Detail</th><th>Approved</th><th>Working</th><th></th></tr></thead><tbody>${lines.map(r=>`<tr><td>${h(r.period_start)}</td><td>${h(r.category)}</td><td>${h(r.detail)}</td><td>${fmt(r.baseline_amount===null?null:Number(r.baseline_amount))} ${h(r.currency)}</td><td><input class="v4-amount" data-money="line-${r.id}" type="number" step="0.01" value="${r.current_amount??''}"></td><td><button class="btn small" data-v4="save-money" data-kind="line" data-entry="${r.id}" data-updated="${h(r.updated_at)}">Save</button></td></tr>`).join('')}</tbody></table></div></details>`:'<p>No cost details entered.</p>'}</section>
 <section class="card panel v4-section"><h2 class="paneltitle">Historical P&amp;L Actuals</h2>${actuals.length?`<div class="table-wrap"><table><thead><tr><th>Period</th><th>Account</th><th>Currency</th><th>Amount</th><th></th></tr></thead><tbody>${actuals.map(r=>`<tr><td>${h(r.period_start)}</td><td>${h(r.account_name)}</td><td>${h(r.currency)}</td><td>${lead()?`<input class="v4-amount" data-money="actual-${r.id}" type="number" step="0.01" value="${r.amount}">`:fmt(Number(r.amount))}</td><td>${lead()?`<button class="btn small" data-v4="save-money" data-kind="actual" data-entry="${r.id}" data-updated="${h(r.updated_at)}">Save</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:'<p>No historical P&amp;L actuals recorded.</p>'}</section>
 <section class="card panel v4-section"><h2 class="paneltitle">Contract</h2>${docs.filter(x=>x.document_type==='contract').map(x=>`<div class="v4-file"><strong>${h(x.original_name)}</strong>${x.preview_pdf_path?`<button class="btn small" data-v4="pdf" data-doc="${h(x.id)}">View PDF</button>`:''}<button class="btn small" data-v4="file" data-doc="${h(x.id)}">Download</button></div>`).join('')||'<p>No contract attached.</p>'}<form id="contract-v4" class="v4-inline"><input name="file" type="file" accept=".pdf,.doc,.docx" required><button class="btn">Upload contract</button></form>
 <h2 class="paneltitle v6-subheading">Project Numbers</h2>${docs.filter(x=>x.document_type==='project_numbers').map(x=>`<div class="v4-file"><strong>${h(x.original_name)}</strong><button class="btn small" data-v4="file" data-doc="${h(x.id)}">Download file</button></div>`).join('')||'<p>No numbers file attached.</p>'}<form id="numbers-v4" class="v4-inline"><input name="file" type="file" accept=".xls,.xlsx,.pdf,.doc,.docx" required><button class="btn">Upload numbers</button></form><div id="existing-proposal-v4" class="v4-proposal" ${pendingV4?'':'hidden'}>${pendingV4?renderSuggestedV4(pendingV4.proposed):''}</div></section>
 <section class="card panel v4-section"><h2 class="paneltitle">Financial Change History</h2>${history.length?`<div class="table-wrap"><table><thead><tr><th>Date / Time (Cairo)</th><th>Changed by</th><th>Field</th><th>Previous</th><th>New</th></tr></thead><tbody>${history.map(x=>`<tr><td>${h(date(x.edited_at))}</td><td>${h((d?.people||[]).find(u=>u.id===x.edited_by)?.display_name||'Unavailable')}</td><td>${h(x.financial_area+' · '+x.entry_key)}</td><td>${h(x.previous_value??'—')}</td><td>${h(x.new_value??'—')}</td></tr>`).join('')}</tbody></table></div>`:'<p>No financial changes recorded.</p>'}</section>`;
}

function renderSuggestedV4(proposed){
 const entries=Object.entries(proposed||{});return `<h3>Review extracted values</h3>${entries.length?`<div class="v4-suggest-grid">${entries.map(([k,v])=>`<div><small>${h(k)}</small><strong>${h(String(v))}</strong></div>`).join('')}</div><button class="btn primary" type="button" data-v4="confirm-import">Confirm and update fields</button>`:'<p>No matching fields were detected. The file remains available to download.</p>'}`;
}

function editProjectV4(){
 const p=fromProject(chosen);if(!p)return projectListV4();
 const data=[['client','Client','text',p.client],['scope','Project scope','text',p.scope],['contractValue','Contract value','number',p.contractValue],['progress','Physical progress (%)','number',p.progress],['location','Location','text',p.location],['startDate','Planned start','date',p.startDate],['baselineFinish','Planned finish','date',p.baselineFinish],['forecastFinish','Forecast finish','date',p.forecastFinish],['durationMonths','Duration months','number',p.durationMonths]];
 return heading('Projects','Edit Project',h(p.id),'<button class="btn" data-v4="cancel-edit">Cancel</button>')+`<section class="card panel"><form id="edit-v4"><div class="v4-formgrid">${data.filter(([key])=>lead()||!['baselineFinish','forecastFinish'].includes(key)).map(([key,label,type,value])=>`<label>${label}<input name="${key}" type="${type}" ${type==='number'?'step="0.01"':''} value="${h(String(value??''))}"></label>`).join('')}${lead()?`<label>Internal project owner<select name="internalOwnerId"><option value="">Not assigned</option>${(detailsV4?.people||[]).map(u=>`<option value="${h(u.id)}" ${u.id===p.internalOwnerId?'selected':''}>${h(u.display_name)}</option>`).join('')}</select></label>`:''}<label>Status<select name="status">${['Active','On Hold','Completed','Cancelled'].map(s=>`<option ${s===p.status?'selected':''}>${s}</option>`).join('')}</select></label></div><div class="form-actions"><button class="btn primary">Save changes</button></div></form></section>`;
}

function financePageV4(){
 return heading('Financials','Project Financials','Review 2027 approved project budgets by budget currency. Contract values are listed separately in their original currencies.')+(dashboardV5?v5Portfolio():dataStatus('Portfolio budget data',dashboardError,'retry-dashboard'))+`<div class="card tablecard"><div class="table-wrap"><table><thead><tr><th>Project</th><th>Client</th><th>Contract Value</th><th>Progress</th><th></th></tr></thead><tbody>${projects.map(p=>`<tr><td>${h(p.id)}</td><td>${h(p.client)}</td><td>${h(moneyLabel(p.contractValue,p.contractCurrency))}</td><td>${p.progress===null?'—':p.progress+'%'}</td><td><button class="btn small" data-project="${h(p.id)}">Open</button></td></tr>`).join('')}</tbody></table></div></div>`;
}

function milestonesPageV4(){
 const recorded=projects.filter(p=>v5Number(p.progress)!==null);
 const progressChart=v7Chart('Recorded Physical Progress By Project','bar',recorded.map(p=>p.id),[{name:'Physical Progress (%)',values:recorded.map(p=>Number(p.progress))}],'%');
 return progressChart+heading('Milestones','Project Schedules','Dates and progress for authorized projects.')+`<div class="card tablecard"><div class="table-wrap"><table><thead><tr><th>Project</th><th>Client</th><th>Start</th><th>Planned finish</th><th>Forecast finish</th><th>Current project end</th><th>Progress</th></tr></thead><tbody>${projects.map(p=>`<tr><td><button class="plink" data-project="${h(p.id)}">${h(p.id)}</button></td><td>${h(p.client)}</td><td>${h(p.startDate||'—')}</td><td>${h(p.baselineFinish||'—')}</td><td>${h(p.forecastFinish||'—')}</td><td>${h(portalProjectEndText(p))}</td><td>${p.progress===null?'—':p.progress+'%'}</td></tr>`).join('')}</tbody></table></div></div>`;
}

function reportPageV4(){
 const selected=reportCode==='all'?projects:projects.filter(p=>p.id===reportCode);
 const recorded=selected.filter(p=>v5Number(p.progress)!==null);
 const chart=v7Chart('Recorded Physical Progress · Selected Projects','bar',recorded.map(p=>p.id),[{name:'Physical Progress (%)',values:recorded.map(p=>Number(p.progress))}],'%');
 return chart+heading('Reports','Project Report','Print the selected project records.','<button class="btn" data-action="print">Print / Save PDF</button>')+`<section class="card panel"><select id="report-code"><option value="all">All accessible projects</option>${projects.map(p=>`<option ${reportCode===p.id?'selected':''} value="${h(p.id)}">${h(p.id)} · ${h(p.displayName||p.client)}</option>`).join('')}</select><div class="table-wrap"><table><thead><tr><th>Code</th><th>Client</th><th>Contract Value</th><th>Current project end</th><th>Progress</th></tr></thead><tbody>${selected.map(p=>`<tr><td>${h(p.id)}</td><td>${h(p.client)}</td><td>${h(moneyLabel(p.contractValue,p.contractCurrency))}</td><td>${h(portalProjectEndText(p))}</td><td>${p.progress===null?'—':p.progress+'%'}</td></tr>`).join('')}</tbody></table></div></section>`;
}

function projectListV4(){
 const matching=projects.filter(p=>(p.id+' '+p.client+' '+p.scope).toLowerCase().includes(filter.toLowerCase()));
 return heading('Projects',lead()?'All Projects':'My Projects',`${projects.length} accessible projects`,'<button class="btn primary" data-v4="new">+ Create New Project</button>')+
 `<div class="filters"><div class="searchbox"><label for="project-search" class="v6-search-label">Search Projects</label><input id="project-search" placeholder="Search projects" value="${h(filter)}"></div></div>`+
 (matching.length?`<div class="projectgrid">${matching.map(projectCard).join('')}</div>`:'<div class="card empty-state">No projects found.</div>');
}

function adminPageV4(){
 if(!admin())return overviewV4();
 return heading('Administration','Project Access','Users and project assignments.')+
 `<div class="card panel"><h2 class="paneltitle">Users</h2><div class="table-wrap"><table><thead><tr><th>Name</th><th>Role</th><th>Active</th></tr></thead><tbody>${adminData.users.map(u=>`<tr><td>${h(u.display_name)}</td><td>${h(roleName[u.role]||u.role)}</td><td>${u.active?'Yes':'No'}</td></tr>`).join('')}</tbody></table></div></div>`;
}

function clearProjectDetails(){
 ++detailsRequest;
 detailsV4=null;detailsError=false;pendingV4=null;
}
async function loadDetailsV4(){
 const project=chosen,request=++detailsRequest;
 detailsV4=null;detailsError=false;
 if(!project)return false;
 try{
  const data=await api('/api/project-data?code='+encodeURIComponent(project));
  if(request!==detailsRequest||chosen!==project)return false;
  detailsV4=data;
 }catch{
  if(request!==detailsRequest||chosen!==project)return false;
  detailsError=true;
 }
 return true;
}

async function uploadV4(pcode,type,file){
 if(!file)return null;
 const form=new FormData();form.set('projectCode',pcode);form.set('documentType',type);form.set('file',file);
 const response=await fetch('/api/documents',{method:'POST',headers:{authorization:'Bearer '+auth.access_token},body:form});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||'Upload failed');return data;
}

async function extractV4(file){
 const form=new FormData();form.set('file',file);
 const response=await fetch('/api/extract',{method:'POST',headers:{authorization:'Bearer '+auth.access_token},body:form});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||'Could not extract project data');
 return data.suggested||{};
}

function approvedChangesV4(s){
 const result={};for(const k of ['client','scope','contractValue','location','progress','startDate','baselineFinish','durationMonths'])if(s[k]!==undefined&&s[k]!==null)result[k]=s[k];return result;
}
ROOT.addEventListener('click',async event=>{
 const button=event.target.closest('button[data-v4]');if(!button)return;
 const action=button.dataset.v4;
 if(action==='new'){creatingV4=true;chosen=null;clearProjectDetails();edit=false;suggestionsV4={};render();focusPage();return;}
 if(action==='cancel-create'){if(await canLeaveCreate()){creatingV4=false;render();focusPage();}return;}
 if(action==='edit'){edit=true;render();return;}
 if(action==='cancel-edit'){edit=false;render();return;}
 if(action==='back'){chosen=null;clearProjectDetails();edit=false;page='projects';render();focusPage();return;}
 if(action==='prompt'){const input=document.querySelector('#ai-v4 input');if(input){input.value=button.dataset.question||'';input.focus();}return;}
 if(action==='clarify'){const input=document.querySelector('#ai-v4 input');if(input){input.value=button.dataset.choice||'';input.focus();}return;}
 if(action==='clear'){aiCancelV9();chatV4=[];aiClarificationV4=null;render();return;}
 if(action==='file'||action==='pdf'){
  let tab=action==='pdf'?window.open('about:blank','_blank'):null;
  try{
   const target='/api/documents/'+encodeURIComponent(button.dataset.doc)+(action==='pdf'?'?view=pdf':'');
   const res=await fetch(target,{headers:{Authorization:'Bearer '+auth.access_token}});
   if(!res.ok)throw new Error('File unavailable');
   const blob=await res.blob(),url=URL.createObjectURL(blob);
   if(action==='pdf'){if(tab)tab.location.href=url;else window.open(url,'_blank');}
   else{const link=document.createElement('a');link.href=url;link.download='Project document';document.body.appendChild(link);link.click();link.remove();}
   setTimeout(()=>URL.revokeObjectURL(url),120000);
  }catch(err){if(tab)tab.close();setError(err)}
  return;
 }
 if(action==='save-money'){
  const kind=button.dataset.kind,entry=button.dataset.entry,
    input=document.querySelector('[data-money="'+kind+'-'+entry+'"]');
  if(!input)return;const amount=input.value===''?null:Number(input.value);
  if(amount!==null&&!Number.isFinite(amount)){setError('Invalid amount');return;}
  button.disabled=true;
  try{await api('/api/finance',{method:'PUT',body:{projectCode:chosen,kind,
   period:kind==='monthly'?entry:undefined,id:kind==='monthly'?undefined:entry,
   updatedAt:button.dataset.updated,amount}});
   await loadDetailsV4();showNotice('Budget updated.');
  }catch(err){setError(err)}
  finally{button.disabled=false}
  return;
 }
 if(action==='apply-precreate'){
  const form=document.getElementById('create-v4');
  for(const [key,value] of Object.entries(suggestionsV4)){
   const field=form?.elements.namedItem(key);if(field&&value!==null&&value!==undefined)field.value=String(value);
  }
  const preview=document.getElementById('numbers-proposal-v4');
  if(preview)preview.innerHTML='<p>Review the populated fields, then create the project.</p>';
  return;
 }
 if(action==='confirm-import'&&pendingV4){
  const changes=approvedChangesV4(pendingV4.proposed||{});
  try{
   if(Object.keys(changes).length){
    const p=fromProject(chosen);
    const result=await api('/api/projects/'+encodeURIComponent(chosen),{
      method:'PUT',body:{lastEdited:p.lastEdited,changes}});
    const i=projects.findIndex(x=>x.id===chosen);if(i>=0)projects[i]=result.project;
   }
   await api('/api/documents',{method:'PUT',body:{projectCode:chosen,documentId:pendingV4.document.id}});
   pendingV4=null;await loadDetailsV4();showNotice('Project numbers confirmed.');
  }catch(err){setError(err)}
 }
});
ROOT.addEventListener('change',async event=>{
 if(event.target?.id!=='numbers-precreate-v4')return;
 const file=event.target.files?.[0],box=document.getElementById('numbers-proposal-v4');
 if(!file||!box)return;
 box.hidden=false;box.textContent='Reading project numbers...';
 try{
  const suggestions=await extractV4(file);
  if(!box.isConnected||event.target.files?.[0]!==file)return;
  suggestionsV4=suggestions;
  const arr=Object.entries(suggestionsV4);
  box.innerHTML='<h3>Proposed fields</h3>'+
    (arr.length?'<div class="v4-suggest-grid">'+arr.map(([k,v])=>
      '<div><small>'+h(k)+'</small><strong>'+h(String(v))+'</strong></div>').join('')+
      '</div><button type="button" class="btn primary" data-v4="apply-precreate">Use these values</button>':
      '<p>No matching fields identified. Complete the project form manually.</p>');
 }catch(err){box.textContent=err.message;}
});
ROOT.addEventListener('submit',async event=>{
 const form=event.target,id=form.id;
 if(!['ai-v4','create-v4','edit-v4','add-period-v4','contract-v4','numbers-v4','assign-v4'].includes(id))return;
 event.preventDefault();
 if(id==='ai-v4'){
  const question=String(new FormData(form).get('question')||'').trim();
  if(!question||chatBusyV4)return;
  const history=chatV4.slice(-6);chatV4.push({role:'user',content:question});
  chatBusyV4=true;const ticket=aiBeginV9();render();
  try{
   const data=await api('/api/assistant',{method:'POST',body:{question,history,clarification:aiClarificationV4}});
   if(ticket!==aiRequestNonceV9)return;
   if(typeof data?.answer!=='string'||!data.answer.trim())throw new Error('Empty assistant response');
   aiClarificationV4=data.clarification||null;
   chatV4.push({role:'assistant',content:data.answer});
  }catch(err){
   if(ticket!==aiRequestNonceV9)return;
   chatV4.push({role:'assistant',content:err?.status===401?'Your session has expired. Please sign in again.':'Project information is temporarily unavailable. Please try again.'});
  }finally{
   if(ticket===aiRequestNonceV9){chatBusyV4=false;render();}
  }
  return;
 }
 if(id==='create-v4'){
  if(creatingRequest)return;
  const f=new FormData(form),str=k=>String(f.get(k)||'').trim();
  const body={projectCode:str('projectCode'),client:str('client'),scope:str('scope'),currency:str('currency'),
    contractValue:str('contractValue')===''?0:Number(str('contractValue')),location:str('location'),
    startDate:str('startDate')||null,baselineFinish:str('baselineFinish')||null,
    forecastFinish:str('forecastFinish')||null,durationMonths:str('durationMonths')===''?null:Number(str('durationMonths'))};
  const contract=form.elements.namedItem('contract')?.files?.[0],numbers=form.elements.namedItem('numbers')?.files?.[0];
  creatingRequest=true;
  const submit=form.querySelector('.form-actions .primary');
  submit.disabled=true;submit.textContent='Creating project…';
  try{
   await api('/api/projects',{method:'POST',body});const failures=[];
   if(contract)try{await uploadV4(body.projectCode,'contract',contract)}catch(err){failures.push('Contract: '+err.message);}
   if(numbers)try{
    const r=await uploadV4(body.projectCode,'project_numbers',numbers);
    if(r.document?.id)await api('/api/documents',{method:'PUT',body:{projectCode:body.projectCode,documentId:r.document.id}});
   }catch(err){failures.push('Project Numbers: '+err.message);}
   creatingV4=false;await reload();chosen=body.projectCode;page='projects';await loadDetailsV4();
   showNotice(failures.length?'Project created. Upload issue: '+failures.join('; '):'Project created.');
  }catch(err){setError(err)}
  finally{creatingRequest=false;submit.disabled=false;submit.textContent='Create project';}
  return;
 }
 if(id==='edit-v4'){
  const f=new FormData(form),str=k=>String(f.get(k)||'').trim();
  const current=fromProject(chosen);
  const changes={client:str('client'),scope:str('scope'),contractValue:str('contractValue')===''?null:Number(str('contractValue')),
   progress:str('progress')===''?null:Number(str('progress')),location:str('location')||null,
   startDate:str('startDate')||null,durationMonths:str('durationMonths')===''?null:Number(str('durationMonths')),status:str('status')};
  if(lead()){
   changes.baselineFinish=str('baselineFinish')||null;
   changes.forecastFinish=str('forecastFinish')||null;
   changes.internalOwnerId=str('internalOwnerId')||null;
  }
  try{const r=await api('/api/projects/'+encodeURIComponent(chosen),{method:'PUT',body:{lastEdited:current.lastEdited,changes}});
   const i=projects.findIndex(p=>p.id===chosen);if(i>=0)projects[i]=r.project;
   edit=false;await loadDetailsV4();showNotice('Project updated.');
  }catch(err){setError(err)}
  return;
 }
 if(id==='assign-v4'){
  const userId=String(new FormData(form).get('userId')||'');
  if(!userId)return;
  try{await api('/api/assignments',{method:'POST',body:{projectCode:chosen,userId}});
   await loadDetailsV4();showNotice('Team Member assigned.');}
  catch(err){setError(err)}
  return;
 }
 if(id==='add-period-v4'){
  const period=String(new FormData(form).get('period')||'');
  if(!/^\d{4}-\d{2}$/.test(period)){setError('Select a month');return;}
  try{await api('/api/finance',{method:'POST',body:{projectCode:chosen,period:period+'-01'}});
   await loadDetailsV4();showNotice('Month added.');
  }catch(err){setError(err)}
  return;
 }
 if(id==='contract-v4'||id==='numbers-v4'){
  const type=id==='contract-v4'?'contract':'project_numbers';
  const file=form.elements.namedItem('file')?.files?.[0];if(!file)return;
  try{const uploaded=await uploadV4(chosen,type,file);
   pendingV4=type==='project_numbers'?uploaded:null;await loadDetailsV4();
   showNotice(type==='contract'?'Contract uploaded.':'Project numbers uploaded. Review and confirm extracted values.');
  }catch(err){setError(err)}
 }
});

init();
// Update the visible Cairo clock without rerendering the dashboard or affecting authentication expiry.
setInterval(()=>{const clock=document.querySelector('[data-cairo-clock]');if(clock)clock.textContent=cairoDateTime(new Date());},60000);
