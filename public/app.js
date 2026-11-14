/* Projects Control v3.1 — Supabase-only; no demo users or fake permissions. */
'use strict';
const ROOT=document.getElementById('app');
const $=(s)=>document.querySelector(s);
const h=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v)=>v===null||v===undefined?'—':Number(v).toLocaleString('en-US',{maximumFractionDigits:2});
const val=(v)=>v===null||v===undefined?'—':h(v);
const date=(d)=>d?new Date(d).toLocaleDateString('en-GB'):'—';
const roleName={super_admin:'Super Admin',head_of_projects:'Head of Projects',team_member:'Team Member'};
const ico=(name)=>({grid:'▦',projects:'▣',chart:'▥',calendar:'▤',reports:'▧',assistant:'◎',admin:'⚙',logout:'↪',back:'‹',edit:'✎',refresh:'↻',shield:'◈',info:'ⓘ',download:'⇩'}[name]||'•');
let cfg=null,auth=null,me=null,projects=[],adminData={users:[],assignments:[]},page='overview',chosen=null,edit=false,busy=false,error='',notice='',filter='',reportCode='all',question='',answer='';
const lead=()=>me?.role==='super_admin'||me?.role==='head_of_projects';
const admin=()=>me?.role==='super_admin';
const fromProject=(id)=>projects.find(p=>p.id===id)||null;
const sourceNote='Live ongoing-projects register from Supabase. The source contains historic 2024–June 2026 monetary figures; it does not contain verified invoice, COGS or recognized revenue records.';
async function init(){
 try{const res=await fetch('/api/config',{cache:'no-store'});cfg=await res.json();}catch{error='Unable to reach the website API. Local functions must be running.';return render()}
 if(!cfg?.configured){error='Supabase connection has not been configured for this website. No real accounts or data are accessible yet.';return render()}
 try{const raw=sessionStorage.getItem('projectsControlSession');if(raw)auth=JSON.parse(raw);}catch{}
 if(auth){try{await ready()}catch(e){if([401,403].includes(e.status))logout(false);else error=e.message||'Unable to load projects';}}
 render();
}
const saveAuth=()=>{if(auth)sessionStorage.setItem('projectsControlSession',JSON.stringify(auth));else sessionStorage.removeItem('projectsControlSession')};
function logout(refresh=true){auth=null;me=null;projects=[];adminData={users:[],assignments:[]};page='overview';chosen=null;edit=false;saveAuth();if(refresh)render()}
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
 auth=v;saveAuth();try{await ready()}catch(e){logout(false);throw e}
}
async function ready(){const s=await api('/api/session');me=s;const r=await api('/api/projects');projects=r.projects||[];if(admin())await loadAdmin();}
async function reload(){const r=await api('/api/projects');projects=r.projects||[];if(chosen&&!fromProject(chosen))chosen=null; if(admin())await loadAdmin();render()}
async function loadAdmin(){adminData=await api('/api/admin/users')}
function setError(err){error=String(err?.message||err||'Unknown error');notice='';render()}
function showNotice(msg){error='';notice=msg;render()}
function loginView(){return `<div class="login-wrap"><section class="login-card"><div class="login-logo"><span class="brandmark">P</span><div class="brandname">Projects Control<small>SECURE MANAGEMENT PORTAL</small></div></div><h1 class="login-title">${cfg?.configured?'Welcome back':'Private configuration required'}</h1><p class="login-desc">${cfg?.configured?'Sign in to access your authorized project portfolio. Your permissions are enforced by the server.':'The approved dashboard is ready for private account configuration; it is not publicly deployed.'}</p>${error?`<div class="error-box" role="alert">${h(error)}</div>`:''}${cfg?.configured?`<form id="login-form"><div class="login-field"><label for="email">Work email</label><input type="email" id="email" name="email" autocomplete="username" placeholder="name@company.com" required></div><div class="login-field"><label for="password">Password</label><input id="password" type="password" name="password" autocomplete="current-password" required></div><button class="btn primary login-button" type="submit">Secure sign in</button></form>`:`<div class="read-only-note">No default password or demonstration login is included. Three profiles are configured in Supabase. Login requires activated Supabase Auth accounts and passwords, which have not been provisioned.</div>`}<p class="source-line" style="margin-top:26px"></p></section></div>`}
const nav=[['overview','grid','Overview'],['projects','projects','Projects'],['financials','chart','Financials'],['milestones','calendar','Milestones'],['reports','reports','Reports'],['admin','admin','Administration']];
function layout(content){const name=h(me.displayName),today=new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'long',year:'numeric'});
 return `<div class="app"><aside class="sidebar"><div class="brand"><span class="brandmark">P</span><div class="brandname">Projects Control<small>MANAGEMENT PORTAL</small></div></div><span class="sidecaption">WORKSPACE</span><nav class="nav">${nav.filter(x=>x[0]!=='admin'||admin()).map(([key,icon,title])=>`<button class="${page===key?'active':''}" data-page="${key}"><span style="display:inline-block;width:18px;font-size:17px;text-align:center">${ico(icon)}</span>${title}${key==='projects'?`<span class="num">${projects.length}</span>`:''}</button>`).join('')}</nav><div class="sidebottom"><span class="online"></span><strong>Secure session</strong><small>${name}<br>${h(roleName[me.role])}</small><button class="signout" data-action="logout">Sign out</button></div></aside><main class="main"><header class="topbar"><div class="breadcrumbs"><span>Projects Control</span><span>›</span><strong>${h(nav.find(n=>n[0]===page)?.[2]||'Projects')}</strong></div><div class="topactions"><span class="topdate">${h(today)}</span><span class="role-label">${h(roleName[me.role])}</span><span class="avatar">${h((me.displayName||'P').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase())}</span></div></header><div class="content">${error?`<div class="error-box" role="alert">${h(error)}</div>`:''}${notice?`<div class="okay-box" role="status" style="margin-bottom:18px">${h(notice)}</div>`:''}${content}<p class="source-line" style="margin-top:32px">Source: private Supabase ongoing-projects register · Financial transaction integrations and automatic email sending are not yet enabled · No automatic FX conversions</p></div></main></div>`}
const heading=(eye,title,subtitle,buttons='')=>`<div class="pageheader"><div><div class="eyebrow">${h(eye)}</div><h1 class="pagetitle">${h(title)}</h1><p class="subtitle">${h(subtitle)}</p></div><div class="meta-row no-print">${buttons}</div></div>`;
const kpi=(label,value,note,variant='')=>`<div class="card kpi"><div class="kpi-top"><span class="kpi-label">${h(label)}</span><span class="kpi-icon ${variant}">▦</span></div><div class="kpi-value">${h(value)}</div><div class="kpi-note">${h(note)}</div></div>`;
const active=()=>projects.filter(p=>p.status==='Active');
const sumFor=(currency)=>active().filter(p=>p.contractCurrency===currency&&p.contractValue!==null).reduce((sum,p)=>sum+p.contractValue,0);
const missing=(field)=>active().filter(p=>p[field]===null).length;
function overview(){return heading('Daily briefing',me.role==='head_of_projects'?'Good morning, Hassan':admin()?'Projects Control · Super Admin':`Good morning, ${me.displayName.split(' ')[0]}`,lead()?'Full registered portfolio.':'Your assigned projects and their latest verified register values.',`<button class="btn" data-action="reload">${ico('refresh')} Refresh</button>`)+`<div class="status-banner">${h(sourceNote)} Progress and other unpopulated fields display as unavailable—not zero.</div><div class="cards">${kpi('Active projects',String(active().length),lead()?'Entire portfolio':'Assigned to you')}${kpi('Signed contracts · EGP',fmt(sumFor('EGP')),'EGP · no FX conversion','blue')}${kpi('Signed contracts · USD',fmt(sumFor('USD')),'USD · kept separate')}${kpi('Progress not supplied',String(missing('progress')),'Physical completion fields missing','amber')}</div><div class="grid-two"><section class="card panel"><div class="panelhead"><div><h2 class="paneltitle">Your active projects</h2><p class="panelmeta">Open a project to inspect verified information</p></div><button class="btn small" data-page="projects">View all</button></div>${projects.length?`<ul class="list-naked">${active().slice(0,6).map(p=>`<li><div><button class="plink" data-project="${h(p.id)}">${h(p.id)} · ${h(p.displayName||p.client)}</button><span class="subline">${h(p.contractCurrency||'Unspecified')} · ${h(p.status||'Unspecified status')}</span></div><span class="pill neutral">${p.progress===null?'Not updated':h(p.progress)+'%'}</span></li>`).join('')}</ul>`:`<div class="empty-state">No projects assigned to this account.</div>`}</section><section class="card panel"><div class="panelhead"><div><h2 class="paneltitle">What is ready</h2><p class="panelmeta">Version 3 secure foundation</p></div></div><ul class="list-naked"><li><span>Project access</span><span class="tag">Enabled</span></li><li><span>Supabase project register</span><span class="tag">Live</span></li><li><span>Project-property editing</span><span class="tag">Enabled</span></li><li><span>Monthly P&L and cash ledger</span><span class="tag inactive">Next phase</span></li><li><span>Automated email and AI model</span><span class="tag inactive">Next phase</span></li></ul></section></div>`}
function projectCard(p){return `<div class="card projectcard"><div class="projecttop"><div><div class="projectid">PROJECT ${h(p.id)}</div><h3 class="projectname">${h(p.displayName||p.client||p.name)}</h3><p class="projectclient">${h(p.name)}</p></div><span class="pill ${p.status==='Active'?'green':'neutral'}">${h(p.status||'Not supplied')}</span></div><div class="projectstats"><span>Contract value</span><strong>${fmt(p.contractValue)} ${h(p.contractCurrency||'')}</strong></div><div class="projectfoot"><span>Physical progress: <strong>${p.progress===null?'Not provided':h(p.progress)+'%'}</strong></span><button class="btn small" data-project="${h(p.id)}">Open project ›</button></div></div>`}
function projectsPage(){const matching=projects.filter(p=>(p.id+' '+p.client+' '+p.name).toLowerCase().includes(filter.toLowerCase()));return heading('Portfolio',lead()?'All projects':'My projects',`${projects.length} accessible project record(s). Direct-report access is restricted by the backend.`,`<button class="btn" data-action="reload">${ico('refresh')} Refresh</button>`)+`<div class="filters"><div class="searchbox"><input id="project-search" placeholder="Search project or code" value="${h(filter)}" aria-label="Search projects"></div></div>${matching.length?`<div class="projectgrid">${matching.map(projectCard).join('')}</div>`:`<div class="card empty-state">No projects match this search.</div>`}`}
function datum(label,v){return `<div><p class="datum-label">${h(label)}</p><div class="datum-value">${h(v)}</div></div>`}
function detail(){const p=fromProject(chosen);if(!p)return projectsPage();let ccy=p.contractCurrency||'';return heading('Project register',`${p.id} · ${p.client}`,p.name,`<button class="btn" data-action="back">${ico('back')} Back</button><button class="btn primary" data-action="edit">${ico('edit')} Edit authorized fields</button>`)+`<div class="status-banner">Register data from Supabase · Last edited ${h(date(p.lastEdited))}. All financial values are in the original project currency (${h(ccy)}).</div><section class="card panel"><div class="panelhead"><div><h2 class="paneltitle">Contract and progress</h2><p class="panelmeta">Editable fields are limited to contract value, physical progress and status in the current Supabase schema.</p></div><span class="pill ${p.status==='Active'?'green':'neutral'}">${h(p.status||'Unspecified')}</span></div><div class="detail-fields">${datum('Contract currency',ccy||'—')}${datum('Contract value',fmt(p.contractValue))}${datum('Physical progress',p.progress===null?'—':p.progress+'%')}${datum('Last record update',date(p.lastEdited))}</div></section><div class="grid-two" style="margin-top:18px"><section class="card panel"><h2 class="paneltitle">Financial detail</h2><p class="notice-line">Detailed COGS, monthly P&L, invoice records and collections are not yet stored in Supabase. They are not estimated from signed contract values.</p><span class="tag inactive">Financial transactions — pending connection</span></section><section class="card panel"><h2 class="paneltitle">Source notes</h2><p class="notice-line break-word">${h(p.notes||'No notes supplied.')}</p><p class="source-line">Source notes are read-only in this foundation to preserve provenance.</p></section></div>`}
function editView(){const p=fromProject(chosen);if(!p)return projectsPage();return heading('Edit project',`${p.id} · ${p.client}`,'Changes are saved to your authorized Supabase project record.',`<button class="btn" data-action="cancel">Cancel</button>`)+`<div class="status-banner">Only the contract amount, manually updated physical progress, and status are currently editable. The save is blocked if the record changed since you opened it.</div><div class="card panel"><form id="edit-form"><div class="form-grid"><div><label>Contract value · ${h(p.contractCurrency||'CCY')}</label><input name="contractValue" type="number" step="0.01" min="0" value="${p.contractValue??''}" required></div><div><label>Physical progress (%)</label><input name="progress" type="number" step="0.01" min="0" max="100" value="${p.progress??''}" placeholder="Not supplied"></div><div><label>Status</label><select name="status">${['Active','On Hold','Completed','Cancelled'].map(x=>`<option value="${x}" ${p.status===x?'selected':''}>${x}</option>`).join('')}</select></div></div><div class="form-actions"><button type="button" class="btn" data-action="cancel">Cancel</button><button type="submit" class="btn primary" ${busy?'disabled':''}>Save to Supabase</button></div></form></div>`}
function finance(){return heading('Financials',lead()?'Department financial control':'My project finances','Signed contract values only; no calculated profit, margin or monthly totals.')+`<div class="status-banner">Detailed P&L, COGS, invoices, actual expenditures and collections have not been configured in Supabase. Their absence does not mean zero cost or zero collections.</div><div class="card tablecard"><div class="tablehead"><h2 class="paneltitle">Contract register</h2></div><div class="table-wrap"><table><thead><tr><th>Code</th><th>Client</th><th>Currency</th><th>Contract value</th><th>Source financial progress</th><th></th></tr></thead><tbody>${projects.map(p=>`<tr><td>${h(p.id)}</td><td>${h(p.client)}</td><td>${h(p.contractCurrency||'—')}</td><td>${fmt(p.contractValue)}</td><td>${fmt(p.sourceTotalProgress)}</td><td><button class="plink" data-project="${h(p.id)}">Open</button></td></tr>`).join('')}</tbody></table></div></div>`}
function milestones(){return heading('Delivery tracking','Milestones & schedules','Physical progress is manual. Milestone and finish-date records are not yet configured.')+`<div class="card tablecard"><div class="tablehead"><h2 class="paneltitle">Project progress register</h2></div><div class="table-wrap"><table><thead><tr><th>Code</th><th>Client</th><th>Source remaining amount</th><th>Currency</th><th>Progress</th><th></th></tr></thead><tbody>${projects.map(p=>`<tr><td>${h(p.id)}</td><td>${h(p.client)}</td><td>${fmt(p.sourceRemaining)}</td><td>${h(p.contractCurrency||'—')}</td><td>${p.progress===null?'Not supplied':h(p.progress)+'%'}</td><td><button class="plink" data-project="${h(p.id)}">Edit</button></td></tr>`).join('')}</tbody></table></div></div>`}
function report(){let scoped=reportCode==='all'?projects:projects.filter(p=>p.id===reportCode);return heading('Reporting','Portfolio report','Print or save a PDF from the current authenticated project records.',`<button class="btn primary" data-action="print">${ico('download')} Print / Save PDF</button><button class="btn" data-action="email">Prepare email draft</button>`)+`<section class="card panel no-print" style="margin-bottom:18px"><label class="sup-label" for="report-code">Report scope</label><select id="report-code" class="select-owner" style="display:block;margin-top:8px"><option value="all">${lead()?'Entire accessible portfolio':'All my assigned projects'}</option>${projects.map(p=>`<option value="${h(p.id)}" ${reportCode===p.id?'selected':''}>${h(p.id)} · ${h(p.displayName||p.client)}</option>`).join('')}</select><p class="source-line">Automatic email delivery and PDF attachments are not connected. Preparing an email draft does not send it.</p></section><section class="card panel report-sheet"><div class="eyebrow">Projects Control · Authorized report</div><h2 style="margin:7px 0 7px">${reportCode==='all'?'Project portfolio':h(scoped[0]?.client||'Project')}</h2><p class="source-line">Prepared: ${new Date().toLocaleString('en-GB')} · Issued for ${h(me.displayName)} (${h(roleName[me.role])}) · Currency amounts are not combined across denominations.</p><div class="table-wrap"><table><thead><tr><th>Project</th><th>Client</th><th>Value</th><th>Progress</th><th>Status</th></tr></thead><tbody>${scoped.map(p=>`<tr><td>${h(p.id)}</td><td>${h(p.client)}</td><td>${fmt(p.contractValue)} ${h(p.contractCurrency||'')}</td><td>${p.progress===null?'—':h(p.progress)+'%'}</td><td>${h(p.status||'—')}</td></tr>`).join('')}</tbody></table></div><p class="source-line" style="margin-top:15px">Source: Supabase ongoing-projects register. This is not a certified financial statement. Invoice, collections and monthly actuals are not yet mapped.</p></section>`}

function administration(){if(!admin())return overview();const users=adminData.users;const ownerOf=code=>{const a=adminData.assignments.filter(x=>x.project_code===code);return a.map(x=>users.find(u=>u.user_id===x.user_id)?.display_name||'Unknown user').join(', ')||'Unassigned'};return heading('Administration','Dashboard access','Profiles and assignments from Supabase; role and assignment edits are not activated in this phase.')+`<div class="cards">${kpi('Project records',String(projects.length),'Visible to Super Admin')}${kpi('User profiles',String(users.length),'Login activation pending')}${kpi('Team members',String(users.filter(x=>x.role==='team_member').length),'Confirmed profiles')}${kpi('Unassigned projects',String(projects.filter(p=>ownerOf(p.id)==='Unassigned').length),'No team-level access')}</div><div class="card tablecard"><div class="tablehead"><div><h2 class="paneltitle">Project assignments</h2><p class="panelmeta">Hassan and Super Admin can see all projects. Mohamed sees only 736 and 776 after Auth activation.</p></div></div><div class="table-wrap"><table><thead><tr><th>Code</th><th>Client</th><th>Team member</th></tr></thead><tbody>${projects.map(p=>`<tr><td>${h(p.id)}</td><td>${h(p.client)}</td><td>${h(ownerOf(p.id))}</td></tr>`).join('')}</tbody></table></div></div><div class="read-only-note" style="margin-top:18px">No Super Admin login has been activated yet. Role security is enforced by Supabase RLS, not by a browser role selector.</div>`}
function render(){ROOT.innerHTML=!me?loginView():layout(creatingV4?createV4():chosen?(edit?editProjectV4():projectViewV4()):page==='overview'?overviewV4():page==='projects'?projectListV4():page==='financials'?financePageV4():page==='milestones'?milestonesPageV4():page==='reports'?reportPageV4():page==='admin'?adminPageV4():overviewV4())}
function clearToast(){error='';notice=''}
ROOT.addEventListener('click',async e=>{
 const el=e.target.closest('button');if(!el)return;
 if(el.dataset.page){chosen=null;edit=false;page=el.dataset.page;filter='';clearToast();render();return}
 if(el.dataset.project){chosen=el.dataset.project;edit=false;creatingV4=false;page='projects';clearToast();await loadDetailsV4();render();return}
 const action=el.dataset.action;
 if(action==='logout'){logout();return}
 if(action==='back'||action==='cancel'){chosen=null;edit=false;render();return}
 if(action==='edit'){edit=true;render();return}
 if(action==='print'){window.print();return}
 if(action==='email'){const ps=reportCode==='all'?projects:projects.filter(p=>p.id===reportCode);const plain=ps.map(p=>`${p.id} — ${p.client}\nContract value: ${fmt(p.contractValue)} ${p.contractCurrency||''}\nProgress: ${p.progress===null?'not supplied':p.progress+'%'}\n`).join('\n');location.href=`mailto:?subject=${encodeURIComponent('Projects Control report')}&body=${encodeURIComponent(plain.slice(0,4000)+'\nSource: Supabase project register. Financial transaction detail not connected.')}`;return}
 if(action==='reload'){try{await reload();showNotice('Current authorized Supabase project data refreshed.')}catch(err){setError(err)}return}
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
let creatingV4=false, detailsV4=null, chatV4=[],chatBusyV4=false,pendingV4=null,suggestionsV4={};
function aiPanelV4(){
 const topics=[["Projects","How many projects can I access?"],["Financials","What are my projects' 2027 budgets?"],["Progress","What is the latest physical progress of my projects?"],["Contracts","What contract details are available?"],["Dates","When are my projects scheduled to finish?"],["Owners","Who is responsible for my projects?"]];
 return `<section class="card ai-card-v4"><div class="ai-top-v4"><h2>AI Assistant</h2><button title="Clear chat" class="ai-menu-v4" data-v4="clear">⋮</button></div><div class="ai-orb-v4"></div><h3 class="ai-heading-v4">What can I help with?</h3><div class="ai-topics-v4">${topics.map(([label,question])=>`<button type="button" data-v4="prompt" data-question="${h(question)}">${label}</button>`).join("")}</div>${chatV4.length?`<div class="ai-chat-v4">${chatV4.map(x=>`<p class="${x.role==='user'?'my-question':''}">${h(x.content)}</p>`).join('')}</div>`:''}<form id="ai-v4" class="ai-input-v4"><span>✣</span><input name="question" placeholder="Ask anything about your projects..." maxlength="1600" required><button ${chatBusyV4?'disabled':''}>↑ Send</button></form></section>`;
}

function overviewV4(){
 return heading("Overview",me.role==="head_of_projects"?"Good evening, Hassan":`Welcome, ${h(me.displayName.split(' ')[0])}`,"Your projects at a glance.",'<button class="btn" data-action="reload">↻ Refresh</button>')+
 `<div class="cards">${kpi('Active projects',String(active().length),'Projects')}${kpi('Signed contracts · EGP',fmt(sumFor('EGP')),'EGP','blue')}${kpi('Signed contracts · USD',fmt(sumFor('USD')),'USD')}${kpi('Progress not recorded',String(missing('progress')),'Projects','amber')}</div><div class="grid-two v4-grid"><section class="card panel"><div class="panelhead"><h2 class="paneltitle">Your active projects</h2><button class="btn small" data-page="projects">View all</button></div><ul class="list-naked">${active().map(p=>`<li><div><button class="plink" data-project="${h(p.id)}">${h(p.id)} · ${h(p.displayName||p.client)}</button><span class="subline">${h(p.status)} · ${h(p.contractCurrency)}</span></div><span class="pill neutral">${p.progress===null?'—':p.progress+'%'}</span></li>`).join('')}</ul></section>${aiPanelV4()}</div>`;
}

function createV4(){
 const fields=[['projectCode','Project code','text'],['client','Client / contracting organization','text'],['scope','Project scope','text'],['contractValue','Contract value','number'],['location','Location','text'],['startDate','Planned start','date'],['baselineFinish','Planned finish','date'],['forecastFinish','Forecast finish','date'],['durationMonths','Duration (months)','number']];
 return heading('Projects','Create New Project','Enter project information and attach files.')+
 `<section class="card panel"><form id="create-v4"><div class="v4-formgrid">${fields.map(([name,label,type])=>`<label>${label}<input name="${name}" type="${type}" ${['projectCode','client','scope'].includes(name)?'required':''} ${type==='number'?'min="0" step="0.01"':''}></label>`).join('')}<label>Currency<select name="currency"><option>EGP</option><option>USD</option><option>EUR</option><option>Other</option></select></label><label>Contract file (PDF or Word)<input name="contract" type="file" accept=".pdf,.doc,.docx"></label><label>Project Numbers (Excel, PDF or Word)<input id="numbers-precreate-v4" name="numbers" type="file" accept=".xls,.xlsx,.pdf,.doc,.docx"></label></div><div id="numbers-proposal-v4" class="v4-proposal" hidden></div><div class="form-actions"><button class="btn" type="button" data-v4="cancel-create">Cancel</button><button class="btn primary">Create project</button></div></form></section>`;
}

function projectViewV4(){
 const p=fromProject(chosen);if(!p)return projectsPage();const d=detailsV4;
 const line=(label,value)=>`<div class="v4-fact"><span>${label}</span><strong>${h(String(value??'Not recorded'))}</strong></div>`;
 const totals=d?.monthly||[],lines=d?.lines||[],actuals=d?.actuals||[],docs=d?.documents||[],history=d?.history||[];
 return heading('Projects',`${h(p.id)} · ${h(p.displayName||p.client)}`,h(p.scope||''),'<button class="btn" data-v4="back">Back</button><button class="btn primary" data-v4="edit">Edit Project</button>')+
 `<section class="card panel v4-section"><h2 class="paneltitle">Project information</h2><div class="v4-facts">${line('Internal owner',p.internalOwnerId===me.userId?me.displayName:((detailsV4?.people||[]).find(u=>u.id===p.internalOwnerId)?.display_name||'Not assigned'))}${line('Client / contracting organization',p.client)}${line('Contract value',fmt(p.contractValue)+' '+p.contractCurrency)}${line('Physical progress',p.progress===null?'Not recorded':p.progress+'%')}${line('Location',p.location)}${line('Start date',p.startDate)}${line('Planned finish',p.baselineFinish)}${line('Forecast finish',p.forecastFinish)}${line('Duration (months)',p.durationMonths)}</div></section>
 <section class="card panel v4-section"><h2 class="paneltitle">Monthly budget</h2>${totals.length?`<div class="table-wrap"><table><thead><tr><th>Period</th><th>Currency</th><th>Approved</th><th>Working budget</th><th></th></tr></thead><tbody>${totals.map(r=>`<tr><td>${h(r.period_start)}</td><td>${h(r.currency)}</td><td>${fmt(r.baseline_amount===null?null:Number(r.baseline_amount))}</td><td><input class="v4-amount" data-money="monthly-${h(r.period_start)}" type="number" step="0.01" value="${r.current_amount??''}"></td><td><button class="btn small" data-v4="save-money" data-kind="monthly" data-entry="${h(r.period_start)}" data-updated="${h(r.updated_at)}">Save</button></td></tr>`).join('')}</tbody></table></div>`:'<p>No budget entered.</p>'}<form id="add-period-v4" class="v4-inline"><label>Add month or year <input type="month" name="period" required></label><button class="btn">Add month</button></form></section>
 <section class="card panel v4-section"><h2 class="paneltitle">Detailed budget &amp; COGS</h2>${lines.length?`<details><summary>View ${lines.length} budget entries</summary><div class="table-wrap v4-scroll"><table><thead><tr><th>Period</th><th>Category</th><th>Detail</th><th>Approved</th><th>Working</th><th></th></tr></thead><tbody>${lines.map(r=>`<tr><td>${h(r.period_start)}</td><td>${h(r.category)}</td><td>${h(r.detail)}</td><td>${fmt(r.baseline_amount===null?null:Number(r.baseline_amount))} ${h(r.currency)}</td><td><input class="v4-amount" data-money="line-${r.id}" type="number" step="0.01" value="${r.current_amount??''}"></td><td><button class="btn small" data-v4="save-money" data-kind="line" data-entry="${r.id}" data-updated="${h(r.updated_at)}">Save</button></td></tr>`).join('')}</tbody></table></div></details>`:'<p>No cost details entered.</p>'}</section>
 <section class="card panel v4-section"><h2 class="paneltitle">Historical P&amp;L actuals</h2>${actuals.length?`<div class="table-wrap"><table><thead><tr><th>Period</th><th>Account</th><th>Currency</th><th>Amount</th><th></th></tr></thead><tbody>${actuals.map(r=>`<tr><td>${h(r.period_start)}</td><td>${h(r.account_name)}</td><td>${h(r.currency)}</td><td>${lead()?`<input class="v4-amount" data-money="actual-${r.id}" type="number" step="0.01" value="${r.amount}">`:fmt(Number(r.amount))}</td><td>${lead()?`<button class="btn small" data-v4="save-money" data-kind="actual" data-entry="${r.id}" data-updated="${h(r.updated_at)}">Save</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:'<p>No historical P&amp;L actuals recorded.</p>'}</section>
 <section class="card panel v4-section"><h2 class="paneltitle">Contract</h2>${docs.filter(x=>x.document_type==='contract').map(x=>`<div class="v4-file"><strong>${h(x.original_name)}</strong>${x.preview_pdf_path?`<button class="btn small" data-v4="pdf" data-doc="${h(x.id)}">View PDF</button>`:''}<button class="btn small" data-v4="file" data-doc="${h(x.id)}">Download</button></div>`).join('')||'<p>No contract attached.</p>'}<form id="contract-v4" class="v4-inline"><input name="file" type="file" accept=".pdf,.doc,.docx" required><button class="btn">Upload contract</button></form>
 <h2 class="paneltitle" style="margin-top:22px">Project Numbers</h2>${docs.filter(x=>x.document_type==='project_numbers').map(x=>`<div class="v4-file"><strong>${h(x.original_name)}</strong><button class="btn small" data-v4="file" data-doc="${h(x.id)}">Download file</button></div>`).join('')||'<p>No numbers file attached.</p>'}<form id="numbers-v4" class="v4-inline"><input name="file" type="file" accept=".xls,.xlsx,.pdf,.doc,.docx" required><button class="btn">Upload numbers</button></form><div id="existing-proposal-v4" class="v4-proposal" ${pendingV4?'':'hidden'}>${pendingV4?renderSuggestedV4(pendingV4.proposed):''}</div></section>
 <section class="card panel v4-section"><h2 class="paneltitle">Financial change history</h2>${history.length?`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Changed by</th><th>Field</th><th>Previous</th><th>New</th></tr></thead><tbody>${history.map(x=>`<tr><td>${h(date(x.edited_at))}</td><td>${h((d?.people||[]).find(u=>u.id===x.edited_by)?.display_name||'Unavailable')}</td><td>${h(x.financial_area+' · '+x.entry_key)}</td><td>${h(x.previous_value??'—')}</td><td>${h(x.new_value??'—')}</td></tr>`).join('')}</tbody></table></div>`:'<p>No financial changes recorded.</p>'}</section>`;
}

function renderSuggestedV4(proposed){
 const entries=Object.entries(proposed||{});return `<h3>Review extracted values</h3>${entries.length?`<div class="v4-suggest-grid">${entries.map(([k,v])=>`<div><small>${h(k)}</small><strong>${h(String(v))}</strong></div>`).join('')}</div><button class="btn primary" type="button" data-v4="confirm-import">Confirm and update fields</button>`:'<p>No matching fields were detected. The file remains available to download.</p>'}`;
}

function editProjectV4(){
 const p=fromProject(chosen);if(!p)return projectsPage();
 const data=[['client','Client','text',p.client],['scope','Project scope','text',p.scope],['contractValue','Contract value','number',p.contractValue],['progress','Physical progress (%)','number',p.progress],['location','Location','text',p.location],['startDate','Planned start','date',p.startDate],['baselineFinish','Planned finish','date',p.baselineFinish],['forecastFinish','Forecast finish','date',p.forecastFinish],['durationMonths','Duration months','number',p.durationMonths]];
 return heading('Projects','Edit Project',h(p.id),'<button class="btn" data-v4="cancel-edit">Cancel</button>')+`<section class="card panel"><form id="edit-v4"><div class="v4-formgrid">${data.map(([key,label,type,value])=>`<label>${label}<input name="${key}" type="${type}" ${type==='number'?'step="0.01"':''} value="${h(String(value??''))}"></label>`).join('')}<label>Status<select name="status">${['Active','On Hold','Completed','Cancelled'].map(s=>`<option ${s===p.status?'selected':''}>${s}</option>`).join('')}</select></label></div><div class="form-actions"><button class="btn primary">Save changes</button></div></form></section>`;
}

function financePageV4(){
 return heading('Financials','Project financials','Select a project to review its budget.')+`<div class="card tablecard"><div class="table-wrap"><table><thead><tr><th>Project</th><th>Client</th><th>Contract</th><th>Progress</th><th></th></tr></thead><tbody>${projects.map(p=>`<tr><td>${h(p.id)}</td><td>${h(p.client)}</td><td>${fmt(p.contractValue)} ${h(p.contractCurrency)}</td><td>${p.progress===null?'—':p.progress+'%'}</td><td><button class="btn small" data-project="${h(p.id)}">Open</button></td></tr>`).join('')}</tbody></table></div></div>`;
}

function milestonesPageV4(){
 return heading('Milestones','Project schedules','Dates and progress for authorized projects.')+`<div class="card tablecard"><div class="table-wrap"><table><thead><tr><th>Project</th><th>Client</th><th>Start</th><th>Planned finish</th><th>Forecast finish</th><th>Progress</th></tr></thead><tbody>${projects.map(p=>`<tr><td><button class="plink" data-project="${h(p.id)}">${h(p.id)}</button></td><td>${h(p.client)}</td><td>${h(p.startDate||'—')}</td><td>${h(p.baselineFinish||'—')}</td><td>${h(p.forecastFinish||'—')}</td><td>${p.progress===null?'—':p.progress+'%'}</td></tr>`).join('')}</tbody></table></div></div>`;
}

function reportPageV4(){
 const selected=reportCode==='all'?projects:projects.filter(p=>p.id===reportCode);
 return heading('Reports','Project report','Print the selected project records.','<button class="btn" data-action="print">Print / Save PDF</button>')+`<section class="card panel"><select id="report-code"><option value="all">All accessible projects</option>${projects.map(p=>`<option ${reportCode===p.id?'selected':''} value="${h(p.id)}">${h(p.id)} · ${h(p.displayName||p.client)}</option>`).join('')}</select><div class="table-wrap"><table><thead><tr><th>Code</th><th>Client</th><th>Contract</th><th>Progress</th></tr></thead><tbody>${selected.map(p=>`<tr><td>${h(p.id)}</td><td>${h(p.client)}</td><td>${fmt(p.contractValue)} ${h(p.contractCurrency)}</td><td>${p.progress===null?'—':p.progress+'%'}</td></tr>`).join('')}</tbody></table></div></section>`;
}

function projectListV4(){
 const matching=projects.filter(p=>(p.id+' '+p.client+' '+p.scope).toLowerCase().includes(filter.toLowerCase()));
 return heading('Projects',lead()?'All projects':'My projects',`${projects.length} accessible projects`,'<button class="btn primary" data-v4="new">+ Create New Project</button>')+
 `<div class="filters"><div class="searchbox"><input id="project-search" placeholder="Search projects" value="${h(filter)}"></div></div>`+
 (matching.length?`<div class="projectgrid">${matching.map(projectCard).join('')}</div>`:'<div class="card empty-state">No projects found.</div>');
}

function adminPageV4(){
 if(!admin())return overviewV4();
 return heading('Administration','Project access','Users and project assignments.')+
 `<div class="card panel"><h2 class="paneltitle">Users</h2><div class="table-wrap"><table><thead><tr><th>Name</th><th>Role</th><th>Active</th></tr></thead><tbody>${adminData.users.map(u=>`<tr><td>${h(u.display_name)}</td><td>${h(roleName[u.role]||u.role)}</td><td>${u.active?'Yes':'No'}</td></tr>`).join('')}</tbody></table></div></div>`;
}

async function loadDetailsV4(){
 detailsV4=null;
 if(!chosen)return;
 try{detailsV4=await api('/api/project-data?code='+encodeURIComponent(chosen))}
 catch(err){error=err.message}
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
 if(action==='new'){creatingV4=true;chosen=null;edit=false;suggestionsV4={};render();return;}
 if(action==='cancel-create'){creatingV4=false;render();return;}
 if(action==='edit'){edit=true;render();return;}
 if(action==='cancel-edit'){edit=false;render();return;}
 if(action==='back'){chosen=null;detailsV4=null;edit=false;page='projects';render();return;}
 if(action==='prompt'){const input=document.querySelector('#ai-v4 input');if(input){input.value=button.dataset.question||'';input.focus();}return;}
 if(action==='clear'){chatV4=[];render();return;}
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
  suggestionsV4=await extractV4(file);
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
 if(!['ai-v4','create-v4','edit-v4','add-period-v4','contract-v4','numbers-v4'].includes(id))return;
 event.preventDefault();
 if(id==='ai-v4'){
  const question=String(new FormData(form).get('question')||'').trim();
  if(!question||chatBusyV4)return;
  const history=chatV4.slice(-6);chatV4.push({role:'user',content:question});
  chatBusyV4=true;render();
  try{const data=await api('/api/assistant',{method:'POST',body:{question,history}});
   chatV4.push({role:'assistant',content:data.answer});}
  catch{chatV4.push({role:'assistant',content:'I could not answer that question right now. Please try again.'});}
  finally{chatBusyV4=false;render();}
  return;
 }
 if(id==='create-v4'){
  const f=new FormData(form),str=k=>String(f.get(k)||'').trim();
  const body={projectCode:str('projectCode'),client:str('client'),scope:str('scope'),currency:str('currency'),
    contractValue:str('contractValue')===''?0:Number(str('contractValue')),location:str('location'),
    startDate:str('startDate')||null,baselineFinish:str('baselineFinish')||null,
    forecastFinish:str('forecastFinish')||null,durationMonths:str('durationMonths')===''?null:Number(str('durationMonths'))};
  const contract=form.elements.namedItem('contract')?.files?.[0],numbers=form.elements.namedItem('numbers')?.files?.[0];
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
  return;
 }
 if(id==='edit-v4'){
  const f=new FormData(form),str=k=>String(f.get(k)||'').trim();
  const current=fromProject(chosen);
  const changes={client:str('client'),scope:str('scope'),contractValue:str('contractValue')===''?null:Number(str('contractValue')),
   progress:str('progress')===''?null:Number(str('progress')),location:str('location')||null,
   startDate:str('startDate')||null,baselineFinish:str('baselineFinish')||null,
   forecastFinish:str('forecastFinish')||null,durationMonths:str('durationMonths')===''?null:Number(str('durationMonths')),status:str('status')};
  try{const r=await api('/api/projects/'+encodeURIComponent(chosen),{method:'PUT',body:{lastEdited:current.lastEdited,changes}});
   const i=projects.findIndex(p=>p.id===chosen);if(i>=0)projects[i]=r.project;
   edit=false;await loadDetailsV4();showNotice('Project updated.');
  }catch(err){setError(err)}
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