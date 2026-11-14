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
let aiMessages=[],aiBusy=false,creating=false,financePortfolio={budgets:[]},financeProject={budgets:[],lines:[],actuals:[],history:[]},projectDocuments=[],budgetEdit=null,uploadedContract=null,uploadedNumbers=null,numberDraft=null,newProjectInputs={};
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
function logout(refresh=true){auth=null;me=null;projects=[];adminData={users:[],assignments:[]};page='overview';chosen=null;edit=false;aiMessages=[];saveAuth();if(refresh)render()}
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
async function ready(){const s=await api('/api/session');me=s;const r=await api('/api/projects');projects=r.projects||[];try{await loadFinance()}catch{financePortfolio={budgets:[]}}if(admin())await loadAdmin();}
async function reload(){const r=await api('/api/projects');projects=r.projects||[];if(chosen&&!fromProject(chosen))chosen=null;try{await loadFinance()}catch{}if(admin())await loadAdmin();render()}
async function loadAdmin(){adminData=await api('/api/admin/users')}
function setError(err){error=String(err?.message||err||'Unknown error');notice='';render()}
function showNotice(msg){error='';notice=msg;render()}
function loginView(){return `<div class="login-wrap"><section class="login-card"><div class="login-logo"><span class="brandmark">P</span><div class="brandname">Projects Control<small>SECURE MANAGEMENT PORTAL</small></div></div><h1 class="login-title">${cfg?.configured?'Welcome back':'Private configuration required'}</h1><p class="login-desc">${cfg?.configured?'Sign in to access your authorized project portfolio. ':'The approved dashboard is ready for private account configuration; it is not publicly deployed.'}</p>${error?`<div class="error-box" role="alert">${h(error)}</div>`:''}${cfg?.configured?`<form id="login-form"><div class="login-field"><label for="email">Work email</label><input type="email" id="email" name="email" autocomplete="username" placeholder="name@company.com" required></div><div class="login-field"><label for="password">Password</label><input id="password" type="password" name="password" autocomplete="current-password" required></div><button class="btn primary login-button" type="submit">Secure sign in</button></form>`:`<div class="read-only-note">No default password or demonstration login is included. Three profiles are configured in Supabase. Login requires activated Supabase Auth accounts and passwords, which have not been provisioned.</div>`}</section></div>`}
const nav=[['overview','grid','Overview'],['projects','projects','Projects'],['financials','chart','Financials'],['milestones','calendar','Milestones'],['reports','reports','Reports'],['admin','admin','Administration']];
function layout(content){const name=h(me.displayName),today=new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'long',year:'numeric'});
 return `<div class="app"><aside class="sidebar"><div class="brand"><span class="brandmark">P</span><div class="brandname">Projects Control<small>MANAGEMENT PORTAL</small></div></div><span class="sidecaption">WORKSPACE</span><nav class="nav">${nav.filter(x=>x[0]!=='admin'||admin()).map(([key,icon,title])=>`<button class="${page===key?'active':''}" data-page="${key}"><span style="display:inline-block;width:18px;font-size:17px;text-align:center">${ico(icon)}</span>${title}${key==='projects'?`<span class="num">${projects.length}</span>`:''}</button>`).join('')}</nav><div class="sidebottom"><span class="online"></span><strong>Secure session</strong><small>${name}<br>${h(roleName[me.role])}</small><button class="signout" data-action="logout">Sign out</button></div></aside><main class="main"><header class="topbar"><div class="breadcrumbs"><span>Projects Control</span><span>›</span><strong>${h(nav.find(n=>n[0]===page)?.[2]||'Projects')}</strong></div><div class="topactions"><span class="topdate">${h(today)}</span><span class="role-label">${h(roleName[me.role])}</span><span class="avatar">${h((me.displayName||'P').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase())}</span></div></header><div class="content">${error?`<div class="error-box" role="alert">${h(error)}</div>`:''}${notice?`<div class="okay-box" role="status" style="margin-bottom:18px">${h(notice)}</div>`:''}${content}</div></main></div>`}
const heading=(eye,title,subtitle,buttons='')=>`<div class="pageheader"><div><div class="eyebrow">${h(eye)}</div><h1 class="pagetitle">${h(title)}</h1><p class="subtitle">${h(subtitle)}</p></div><div class="meta-row no-print">${buttons}</div></div>`;
const kpi=(label,value,note,variant='')=>`<div class="card kpi"><div class="kpi-top"><span class="kpi-label">${h(label)}</span><span class="kpi-icon ${variant}">▦</span></div><div class="kpi-value">${h(value)}</div><div class="kpi-note">${h(note)}</div></div>`;
const active=()=>projects.filter(p=>p.status==='Active');
const sumFor=(currency)=>active().filter(p=>p.contractCurrency===currency&&p.contractValue!==null).reduce((sum,p)=>sum+p.contractValue,0);
const missing=(field)=>active().filter(p=>p[field]===null).length;
function aiPanel(){
 const samples=['How many projects?','2027 budgets','Project progress','Contract values','Project locations','Project owners','Finish dates'];
 const messages=aiMessages.map(m=>`<div class="ai-message ${m.role==='user'?'mine':'reply'}"><div class="ai-bubble">${h(m.content)}</div></div>`).join('');
 return `<section class="card ai-panel" aria-label="Projects AI Assistant"><div class="ai-head"><h2>AI Assistant</h2><button class="ai-more" title="Clear conversation" data-action="clear-ai" aria-label="Clear AI conversation">⋮</button></div><div class="ai-chat" role="log" aria-live="polite">${!aiMessages.length?`<div class="ai-intro"><div class="ai-orb" aria-hidden="true"></div><h3>What can I help with?</h3><div class="ai-prompts">${samples.map(s=>`<button type="button" class="ai-chip" data-ai-prompt="${h(s)}">${h(s)}</button>`).join('')}</div></div>`:messages}${aiBusy?`<div class="ai-message reply"><div class="ai-bubble ai-thinking"><span></span><span></span><span></span></div></div>`:''}</div><form id="ai-form" class="ai-form"><span class="ai-plus" aria-hidden="true">✣</span><input name="question" aria-label="Ask the AI Assistant" placeholder="Ask about your projects, budgets, contracts..." autocomplete="off" maxlength="800" required><button class="ai-send" type="submit" ${aiBusy?'disabled':''}>↑ Send</button></form></section>`;
}
async function askAssistant(prompt){
 const text=String(prompt||'').trim();if(!text||aiBusy)return;
 const history=aiMessages.slice(-8).map(m=>({role:m.role,content:m.content}));
 aiMessages.push({role:'user',content:text});aiBusy=true;render();
 try{const r=await api('/api/assistant',{method:'POST',body:{question:text,history}});aiMessages.push({role:'assistant',content:String(r.answer||'I could not find an answer in the available project records.')});}
 catch(err){aiMessages.push({role:'assistant',content:'I could not retrieve the requested information. Please try again.'});}
 finally{aiBusy=false;render();const log=$('.ai-chat');if(log)log.scrollTop=log.scrollHeight;}
}
function overview(){
 return heading('Dashboard',me.role==='head_of_projects'?'Good morning, Hassan':admin()?'Projects Control':`Good morning, ${me.displayName.split(' ')[0]}`,lead()?'Project portfolio overview.':'Your assigned and created projects.',`<button class="btn" data-action="reload">${ico('refresh')} Refresh</button>`)+`<div class="cards">${kpi('Active projects',String(active().length),lead()?'Current portfolio':'Your projects')}${kpi('Signed contracts · EGP',fmt(sumFor('EGP')),'EGP','blue')}${kpi('Signed contracts · USD',fmt(sumFor('USD')),'USD')}${kpi('Progress not recorded',String(missing('progress')),'Projects requiring an update','amber')}</div><div class="grid-two"><section class="card panel"><div class="panelhead"><div><h2 class="paneltitle">Your active projects</h2><p class="panelmeta">Select a project for details</p></div><button class="btn small" data-page="projects">View all</button></div>${projects.length?`<ul class="list-naked">${active().slice(0,7).map(p=>`<li><div><button class="plink" data-project="${h(p.id)}">${h(p.id)} · ${h(p.projectTitle||p.client)}</button><span class="subline">${h(p.contractCurrency||'Unspecified')} · ${h(p.status||'Unspecified status')}</span></div><span class="pill neutral">${p.progress===null?'Not updated':h(p.progress)+'%'}</span></li>`).join('')}</ul>`:`<div class="empty-state">No projects currently assigned.</div>`}</section>${aiPanel()}</div>`;
}
function projectCard(p){return `<div class="card projectcard"><div class="projecttop"><div><div class="projectid">PROJECT ${h(p.id)}</div><h3 class="projectname">${h(p.client||p.name)}</h3><p class="projectclient">${h(p.name)}</p></div><span class="pill ${p.status==='Active'?'green':'neutral'}">${h(p.status||'Not supplied')}</span></div><div class="projectstats"><span>Contract value</span><strong>${fmt(p.contractValue)} ${h(p.contractCurrency||'')}</strong></div><div class="projectfoot"><span>Physical progress: <strong>${p.progress===null?'Not provided':h(p.progress)+'%'}</strong></span><button class="btn small" data-project="${h(p.id)}">Open project ›</button></div></div>`}
async function loadFinance(project){const suffix=project?'?project='+encodeURIComponent(project):'';const data=await api('/api/finance'+suffix);if(project)financeProject=data;else financePortfolio=data;}
async function loadDocuments(project){const data=await api('/api/documents?project='+encodeURIComponent(project));projectDocuments=data.documents||[];}
async function openProject(project){chosen=project;edit=false;page='projects';budgetEdit=null;clearToast();render();try{await Promise.all([loadFinance(project),loadDocuments(project)])}catch(err){error=err.message||'Could not load the project';}render();}
const monthTitle=(d)=>{if(!d)return '—';const [y,m]=d.split('-');return new Date(Date.UTC(+y,+m-1,1)).toLocaleDateString('en-GB',{month:'short',year:'numeric',timeZone:'UTC'})};
const projectBudgetRows=(id)=>financePortfolio.budgets.filter(b=>b.project_code===id&&b.period_start.startsWith('2027'));
const budgetTotal=(rows,key)=>rows.length?rows.reduce((a,r)=>a+Number(r[key]||0),0):null;
function budgetTable(p){
 const rows=(financeProject.budgets||[]).filter(r=>r.project_code===p.id).sort((a,b)=>a.period_start.localeCompare(b.period_start));
 const total=budgetTotal(rows,'current_amount'),base=budgetTotal(rows,'baseline_amount');
 return `<section class="card panel" style="margin-top:18px"><div class="panelhead"><div><h2 class="paneltitle">Monthly budgets</h2><p class="panelmeta">Approved baseline and editable working figures</p></div></div><div class="table-wrap"><table><thead><tr><th>Month</th><th>Approved</th><th>Working</th><th>Currency</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td>${h(monthTitle(r.period_start))}</td><td>${fmt(r.baseline_amount)}</td><td><strong>${fmt(r.current_amount)}</strong></td><td>${h(r.currency)}</td><td><button class="plink" data-budget-month="${h(r.period_start)}">Edit</button></td></tr>`).join('')}${!rows.length?`<tr><td colspan="5">No monthly budgets entered.</td></tr>`:''}</tbody></table></div>${rows.length?`<div class="budget-totals"><strong>Working total: ${fmt(total)} ${h(rows[0].currency)}</strong><span>Approved baseline: ${fmt(base)} ${h(rows[0].currency)}</span></div>`:''}${budgetEdit?.type==='month'?`<form id="budget-edit-form" class="budget-inline-form"><input type="hidden" name="type" value="month"><label>Update ${h(monthTitle(budgetEdit.period))}<input type="number" step="any" name="amount" value="${h(rows.find(r=>r.period_start===budgetEdit.period)?.current_amount??'')}" required></label><button type="submit" class="btn primary">Save change</button><button type="button" class="btn" data-action="cancel-budget">Cancel</button></form>`:''}<form id="add-budget-month-form" class="budget-inline-form"><label>Add a month or year<input type="month" name="period" required min="2027-01" max="2100-12"></label><button class="btn" type="submit">Add period</button></form></section>`;
}
function budgetLines(p){
 const rows=(financeProject.lines||[]).filter(x=>x.project_code===p.id),actuals=(financeProject.actuals||[]).filter(x=>x.project_code===p.id),history=(financeProject.history||[]);
 return `<section class="card panel" style="margin-top:18px"><details class="finance-details" ${budgetEdit?.type==='line'?'open':''}><summary>Manpower and COGS details (${rows.length})</summary><div class="table-wrap"><table><thead><tr><th>Month</th><th>Group</th><th>Item</th><th>Approved</th><th>Working</th><th></th></tr></thead><tbody>${rows.map(x=>`<tr><td>${h(monthTitle(x.period_start))}</td><td>${h(x.category)}</td><td>${h(x.detail)}</td><td>${fmt(x.baseline_amount)}</td><td>${fmt(x.current_amount)}</td><td><button class="plink" data-budget-line="${x.id}">Edit</button></td></tr>`).join('')}${!rows.length?'<tr><td colspan="6">No detailed budget items entered.</td></tr>':''}</tbody></table></div>${budgetEdit?.type==='line'?`<form id="budget-edit-form" class="budget-inline-form"><input type="hidden" name="type" value="line"><label>Update budget item<input type="number" step="any" name="amount" value="${h(rows.find(x=>x.id===budgetEdit.id)?.current_amount??'')}" required></label><button type="submit" class="btn primary">Save change</button><button type="button" class="btn" data-action="cancel-budget">Cancel</button></form>`:''}</details></section><section class="card panel" style="margin-top:18px"><details class="finance-details"><summary>Historical P&L actuals (${actuals.length})</summary><div class="table-wrap"><table><thead><tr><th>Period</th><th>Account</th><th>Amount</th><th>Currency</th></tr></thead><tbody>${actuals.map(a=>`<tr><td>${h(monthTitle(a.period_start))}</td><td>${h(a.account_name)}</td><td>${fmt(a.amount)}</td><td>${h(a.currency)}</td></tr>`).join('')}${!actuals.length?'<tr><td colspan="4">No historical P&L figures have been entered.</td></tr>':''}</tbody></table></div></details></section><section class="card panel" style="margin-top:18px"><details class="finance-details"><summary>Financial change history (${history.length})</summary><div class="table-wrap"><table><thead><tr><th>Date</th><th>Area</th><th>Previous</th><th>New</th><th>Editor</th></tr></thead><tbody>${history.map(x=>`<tr><td>${h(date(x.edited_at))}</td><td>${h(x.financial_area)}</td><td>${h(x.previous_value??'—')}</td><td>${h(x.new_value??'—')}</td><td>${h(x.edited_by||'Not recorded')}</td></tr>`).join('')}${!history.length?'<tr><td colspan="5">No changes recorded.</td></tr>':''}</tbody></table></div></details></section>`;
}
function projectDocumentsPanel(p){
 const docs=projectDocuments||[],contracts=docs.filter(x=>x.document_type==='contract'),numbers=docs.filter(x=>x.document_type==='project_numbers');
 const docLinks=(items,mode)=>items.length?items.map(d=>`<li><button class="plink" data-document-id="${h(d.id)}" data-document-mode="${mode==='contract'&&d.preview_pdf_path?'preview':'download'}">${h(d.original_name)}</button><span class="subline">${mode==='contract'?(d.preview_pdf_path?'View PDF':'Download original'):'Download original file'}</span></li>`).join(''):'<li>No files uploaded.</li>';
 return `<section class="card panel" style="margin-top:18px"><h2 class="paneltitle">Project documents</h2><div class="grid-two document-columns"><div><h3 class="section-label">Contract</h3><ul class="doc-list">${docLinks(contracts,'contract')}</ul></div><div><h3 class="section-label">Project Numbers</h3><ul class="doc-list">${docLinks(numbers,'numbers')}</ul></div></div><form id="project-document-form"><div class="doc-upload-fields"><label>Contract (Excel, PDF, Word)<input type="file" name="contract" accept=".pdf,.doc,.docx,.xls,.xlsx"></label><label>Project Numbers (Excel, PDF, Word)<input type="file" name="project_numbers" accept=".pdf,.doc,.docx,.xls,.xlsx"></label></div><button type="submit" class="btn">Upload documents</button></form></section>`;
}
async function officeZipEntries(file){
 const bytes=new Uint8Array(await file.arrayBuffer()),view=new DataView(bytes.buffer),reader=new TextDecoder('utf-8'),texts={};
 let e=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(view.getUint32(i,true)===0x06054b50){e=i;break;}}
 if(e<0)throw Error('This is not a supported Office workbook or document.');
 let offset=view.getUint32(e+16,true),count=view.getUint16(e+10,true),readCount=0;
 if(count>3000)throw Error('Too many files in document');
 for(let j=0;j<count;j++){
  if(view.getUint32(offset,true)!==0x02014b50)throw Error('Invalid document archive');
  const method=view.getUint16(offset+10,true),compressed=view.getUint32(offset+20,true),plain=view.getUint32(offset+24,true),nameLen=view.getUint16(offset+28,true),extra=view.getUint16(offset+30,true),comment=view.getUint16(offset+32,true),local=view.getUint32(offset+42,true);
  const name=reader.decode(bytes.subarray(offset+46,offset+46+nameLen));offset+=46+nameLen+extra+comment;
  if(!(/^(xl\/sharedStrings\.xml|xl\/workbook\.xml|xl\/_rels\/workbook\.xml\.rels|xl\/worksheets\/sheet\d+\.xml|word\/document\.xml)$/.test(name)))continue;
  if(plain>5e6||compressed>5e6||readCount+plain>18e6)throw Error('Document content exceeds preview limit');
  if(view.getUint32(local,true)!==0x04034b50)throw Error('Invalid file header');
  const start=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);
  if(start+compressed>bytes.length)throw Error('Incomplete document');
  let data=bytes.subarray(start,start+compressed);
  if(method===8){if(typeof DecompressionStream!=='function')throw Error('Compressed Office extraction is not supported by this browser');const stream=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));data=new Uint8Array(await new Response(stream).arrayBuffer());}
  else if(method!==0)throw Error('Unsupported Office compression');
  if(data.length>5e6)throw Error('Extracted content too large');
  texts[name]=reader.decode(data);readCount+=data.length;
 }
 return texts;
}
function parseOfficeRows(xml,shared){
 const dom=new DOMParser().parseFromString(xml,'application/xml');if(dom.querySelector('parsererror'))throw Error('The file has invalid spreadsheet XML');
 const rows=[];
 const all=Array.from(dom.getElementsByTagName('row')).slice(0,300);
 for(const row of all){const out=[];for(const c of Array.from(row.getElementsByTagName('c')).slice(0,200)){
  const ref=c.getAttribute('r')||'',col=ref.match(/^[A-Z]+/)?.[0]||'A';
  let idx=0;for(const x of col)idx=idx*26+x.charCodeAt(0)-64;idx--;
  const raw=c.getElementsByTagName('v')[0]?.textContent||'';
  const value=c.getAttribute('t')==='s'?(shared[+raw]??''):c.getAttribute('t')==='inlineStr'?(c.getElementsByTagName('is')[0]?.textContent||''):raw;
  if(value!=='')out[idx]=String(value).trim();
 }
 if(out.some(x=>x!==undefined&&x!==''))rows.push(out);}
 return rows;
}
function inspectOfficeRows(rows,fileName){
 const fields={},budgets=[],aliases={
  projectCode:['project code','project id','job code'],
  client:['client','customer','contracting organization'],
  scope:['project name','project scope','project description'],
  contractValue:['contract value','contract amount','contract price'],
  currency:['currency','contract currency'],
  location:['location','project location','site location'],
  durationMonths:['project months','duration months','project duration'],
  plannedStart:['planned start date','start date'],
  plannedFinish:['planned finish date','finish date','completion date']
 };
 const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
 const parseAmount=s=>{const v=String(s||'').replace(/,/g,'').replace(/[^0-9.+-]/g,'');return v!==''&&Number.isFinite(Number(v))?Number(v):null};
 for(let r=0;r<Math.min(75,rows.length);r++){const row=rows[r];for(let c=0;c<Math.min(70,row.length);c++){
  const label=normalize(row[c]);if(!label||label.length>50)continue;
  for(const [key,names] of Object.entries(aliases)){if(fields[key]!==undefined||!names.includes(label))continue;
   const v=(row[c+1]||rows[r+1]?.[c]||'').trim();if(!v||v.length>300)continue;
   if(['contractValue','durationMonths'].includes(key)){const n=parseAmount(v);if(n!==null)fields[key]=n;}
   else if(key==='projectCode'){if(/^\d{2,5}(\.\d{1,3})?$/.test(v))fields[key]=v;}
   else if(key==='currency'){if(['EGP','USD','EUR','Other'].includes(v))fields[key]=v;}
   else if(key==='plannedStart'||key==='plannedFinish'){
    const d=/^\d{4}-\d{2}-\d{2}$/.test(v)?v:null;if(d)fields[key]=d;
   }else fields[key]=v;
  }
 }}
 // A recognizable row of monthly budget headings followed by one project-specific row.
 const monthNames=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
 const headerIndex=rows.findIndex(row=>row.filter(x=>x&&monthNames.some(m=>normalize(x).startsWith(m+' '))).length>=3);
 const fileText=(rows.slice(0,4).map(r=>r.join(' ')).join(' ')+' '+fileName);
 const year=fileText.match(/\b20[2-9]\d\b/)?.[0];
 let note='';
 if(headerIndex>=0&&year){
  const headers=rows[headerIndex],possibles=rows.slice(headerIndex+1).filter(r=>r.some(x=>x!==undefined&&x!==''));
  const targetCode=String(newProjectInputs?.projectCode||fields.projectCode||'');
  const target=targetCode?possibles.find(r=>r.some(v=>String(v||'')===targetCode)):possibles.length===1?possibles[0]:null;
  if(target){
   headers.forEach((h,i)=>{if(!h)return;const key=normalize(h),ix=monthNames.findIndex(m=>key===m||key.startsWith(m+' '));if(ix<0)return;const raw=target[i];const v=parseAmount(raw);if(v===null)return;budgets.push({period:`${year}-${String(ix+1).padStart(2,'0')}-01`,amount:v,currency:fields.currency||'EGP'});});
  }else if(possibles.length>1)note='The workbook contains multiple project rows. Select a project-specific file or enter the figures manually.';
 }
 return {fields,monthlyBudgets:budgets,note:note||(!Object.keys(fields).length&&!budgets.length?'No matching project fields were recognized; you can still attach the file and enter the details manually.':'')};
}
async function extractProjectNumbers(file){
 const ext=(file.name.split('.').pop()||'').toLowerCase();
 if(ext==='xlsx'){
  const z=await officeZipEntries(file),sharedXML=z['xl/sharedStrings.xml']||'',shared=[];
  if(sharedXML){const ss=new DOMParser().parseFromString(sharedXML,'application/xml');for(const node of ss.getElementsByTagName('si'))shared.push(node.textContent||'');}
  const sheets=Object.keys(z).filter(x=>/^xl\/worksheets\/sheet\d+\.xml$/.test(x)).sort().slice(0,3);
  if(!sheets.length)throw Error('No worksheets found in Excel document');
  for(const name of sheets){const data=inspectOfficeRows(parseOfficeRows(z[name],shared),file.name);if(Object.keys(data.fields).length||data.monthlyBudgets.length)return data;}
  return {fields:{},monthlyBudgets:[],note:'No matching project fields were recognized. Please enter the values manually.'};
 }
 if(ext==='docx'){const z=await officeZipEntries(file);return {fields:{},monthlyBudgets:[],note:z['word/document.xml']?'Word documents are stored; review and enter any figures manually.':'Unable to read figures from this Word document.'};}
 return {fields:{},monthlyBudgets:[],note:'The file will be preserved. Automatic number extraction currently works with standard .xlsx workbooks; review and enter other formats manually.'};
}
function newProjectView(){
 const f=newProjectInputs||{},field=(name,label,type='text',required=false,extra='')=>`<label>${h(label)}<input name="${name}" type="${type}" value="${h(f[name]??'')}" ${required?'required':''} ${extra}></label>`;
 const recognized=numberDraft?.fields?Object.entries(numberDraft.fields):[];
 const monthCount=numberDraft?.monthlyBudgets?.length||0;
 return heading('Projects','Create New Project','Fill the project information or attach a Project Numbers file to propose matching values.',`<button class="btn" data-action="cancel-create">Back to projects</button>`)+`<section class="card panel create-project-card"><form id="new-project-form"><div class="form-grid-two">${field('projectCode','Project code','text',true,'placeholder="e.g. 850" pattern="[0-9]{2,5}(\\.[0-9]{1,3})?"')}${field('client','Client / contracting organization','text',true)}${field('scope','Project name / scope','text',true)}<label>Contract currency<select name="currency" required><option value="">Choose currency</option>${['EGP','USD','EUR','Other'].map(v=>`<option value="${v}" ${f.currency===v?'selected':''}>${v}</option>`).join('')}</select></label>${field('contractValue','Contract value','number',true,'step="any" min="0"')}${field('location','Project location')}${field('plannedStart','Planned start date','date')}${field('plannedFinish','Planned finish date','date')}${field('durationMonths','Project duration (months)','number',false,'min="1" max="600" step="1"')}</div><div class="doc-upload-fields"><label>Contract file<input type="file" name="contract" accept=".pdf,.doc,.docx,.xls,.xlsx"></label><label>Project Numbers file<input type="file" name="project_numbers" accept=".pdf,.doc,.docx,.xls,.xlsx" id="new-project-numbers"></label></div>${uploadedContract?`<p class="file-picked">Contract: ${h(uploadedContract.name)}</p>`:''}${uploadedNumbers?`<p class="file-picked">Project Numbers: ${h(uploadedNumbers.name)}</p>`:''}${numberDraft?`<div class="number-review"><strong>Review proposed figures</strong>${recognized.length?`<ul>${recognized.map(([k,v])=>`<li>${h(k)}: ${h(v)}</li>`).join('')}</ul>`:''}${monthCount?`<p>${monthCount} monthly budget figure(s) identified for confirmation.</p>`:''}${numberDraft.note?`<p>${h(numberDraft.note)}</p>`:''}<label class="check-confirm"><input type="checkbox" name="confirmNumbers" required> I have reviewed the proposed values and confirm the project information and financial entries.</label></div>`:''}<div class="form-actions"><button class="btn primary" type="submit" ${busy?'disabled':''}>${busy?'Saving…':'Create project'}</button><button class="btn" type="button" data-action="cancel-create">Cancel</button></div></form></section>`;
}
async function uploadDocument(project,type,file){
 if(!file)return null;
 if(file.size>20*1024*1024)throw Error('The file must be under 20 MB.');
 if(auth.expires_at&&Date.now()/1000>auth.expires_at-45&&!await refreshToken())throw Error('Sign in again to upload.');
 const r=await fetch(`/api/documents?project=${encodeURIComponent(project)}&type=${encodeURIComponent(type)}`,{method:'POST',headers:{authorization:`Bearer ${auth.access_token}`,'x-file-name':encodeURIComponent(file.name),'content-type':file.type||'application/octet-stream'},body:file});
 let result={};try{result=await r.json()}catch{}
 if(!r.ok)throw Error(result.error||'Unable to upload document');
 return result.document;
}
async function downloadDocument(id,preview){
 if(auth.expires_at&&Date.now()/1000>auth.expires_at-45&&!await refreshToken())throw Error('Session expired');
 const r=await fetch(`/api/documents/${encodeURIComponent(id)}?download=${preview?'0':'1'}`,{headers:{authorization:`Bearer ${auth.access_token}`},cache:'no-store'});
 if(!r.ok){let data={};try{data=await r.json()}catch{}throw Error(data.error||'Document unavailable');}
 const blob=await r.blob(),url=URL.createObjectURL(blob);
 if(preview){const tab=window.open(url,'_blank','noopener,noreferrer');if(!tab){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.click();}}else{const item=projectDocuments.find(x=>x.id===id);const a=document.createElement('a');a.href=url;a.download=item?.original_name||'project-document';document.body.appendChild(a);a.click();a.remove();}
 setTimeout(()=>URL.revokeObjectURL(url),90000);
}
function projectsPage(){
 const matching=projects.filter(p=>(p.id+' '+p.client+' '+p.name).toLowerCase().includes(filter.toLowerCase()));
 return heading('Projects',lead()?'Project portfolio':'My projects',`${projects.length} accessible project${projects.length===1?'':'s'}.`,`<button class="btn primary" data-action="new-project">+ Create New Project</button>`)+`<div class="filters"><div class="searchbox"><input id="project-search" placeholder="Search project or code" value="${h(filter)}" aria-label="Search projects"></div></div>${matching.length?`<div class="projectgrid">${matching.map(projectCard).join('')}</div>`:`<div class="card empty-state">No projects match your search.</div>`}`;
}
function datum(label,v){return `<div><p class="datum-label">${h(label)}</p><div class="datum-value">${h(v)}</div></div>`}
function detail(){
 const p=fromProject(chosen);if(!p)return newProjectsPage();let ccy=p.contractCurrency||'';
 return heading('Project details',`${p.id} · ${p.projectTitle||p.client}`,p.client,`<button class="btn" data-action="back">${ico('back')} Back</button><button class="btn primary" data-action="edit">${ico('edit')} Edit project</button>`)+`<section class="card panel"><div class="panelhead"><div><h2 class="paneltitle">Project information</h2></div><span class="pill ${p.status==='Active'?'green':'neutral'}">${h(p.status||'—')}</span></div><div class="detail-fields">${datum('Client / Contracting Organization',p.client)}${datum('Internal Project Owner',p.internalOwnerId||'Not assigned')}${datum('Contract value',fmt(p.contractValue)+' '+ccy)}${datum('Physical progress',p.progress===null?'Not recorded':p.progress+'%')}${datum('Location',p.location||'Not recorded')}${datum('Start date',p.plannedStart||'Not recorded')}${datum('Planned finish',p.plannedFinish||'Not recorded')}${datum('Forecast finish',p.forecastFinish||'Not recorded')}${datum('Project duration',p.durationMonths?p.durationMonths+' months':'Not recorded')}</div></section><section class="card panel" style="margin-top:18px"><h2 class="paneltitle">Extend project duration</h2><form id="extension-form" class="budget-inline-form"><label>Planned duration (months)<input type="number" name="durationMonths" min="1" max="600" value="${h(p.durationMonths||'')}" required></label><label>Revised finish date<input type="date" name="forecastFinish" value="${h(p.forecastFinish||'')}"></label><button type="submit" class="btn">Save extension</button></form></section>${projectDocumentsPanel(p)}${budgetTable(p)}${budgetLines(p)}<section class="card panel" style="margin-top:18px"><h2 class="paneltitle">Project notes</h2><p class="notice-line break-word">${h(p.notes||'No notes recorded.')}</p></section>`;
}
function editView(){const p=fromProject(chosen);if(!p)return projectsPage();return heading('Edit project',`${p.id} · ${p.client}`,'Changes are saved to your authorized Supabase project record.',`<button class="btn" data-action="cancel">Cancel</button>`)+`<div class="status-banner">Only the contract amount, manually updated physical progress, and status are currently editable. The save is blocked if the record changed since you opened it.</div><div class="card panel"><form id="edit-form"><div class="form-grid"><div><label>Contract value · ${h(p.contractCurrency||'CCY')}</label><input name="contractValue" type="number" step="0.01" min="0" value="${p.contractValue??''}" required></div><div><label>Physical progress (%)</label><input name="progress" type="number" step="0.01" min="0" max="100" value="${p.progress??''}" placeholder="Not supplied"></div><div><label>Status</label><select name="status">${['Active','On Hold','Completed','Cancelled'].map(x=>`<option value="${x}" ${p.status===x?'selected':''}>${x}</option>`).join('')}</select></div></div><div class="form-actions"><button type="button" class="btn" data-action="cancel">Cancel</button><button type="submit" class="btn primary" ${busy?'disabled':''}>Save to Supabase</button></div></form></div>`}
function finance(){
 return heading('Financials',lead()?'Project financials':'My project budgets','Approved 2027 figures and editable working budgets.')+`<div class="card tablecard"><div class="tablehead"><h2 class="paneltitle">2027 project budgets</h2></div><div class="table-wrap"><table><thead><tr><th>Project</th><th>Client</th><th>Approved</th><th>Working</th><th>Currency</th><th></th></tr></thead><tbody>${projects.map(p=>{const rows=projectBudgetRows(p.id),ccy=rows[0]?.currency||'—';return `<tr><td>${h(p.id)}</td><td>${h(p.projectTitle||p.client)}</td><td>${fmt(budgetTotal(rows,'baseline_amount'))}</td><td><strong>${fmt(budgetTotal(rows,'current_amount'))}</strong></td><td>${h(ccy)}</td><td><button class="plink" data-project="${h(p.id)}">Details</button></td></tr>`}).join('')}</tbody></table></div></div>`;
}
function milestones(){return heading('Delivery','Projects and schedules','Current physical progress and project durations.')+`<div class="card tablecard"><div class="tablehead"><h2 class="paneltitle">Project progress</h2></div><div class="table-wrap"><table><thead><tr><th>Project</th><th>Client</th><th>Duration</th><th>Forecast finish</th><th>Progress</th><th></th></tr></thead><tbody>${projects.map(p=>`<tr><td>${h(p.id)}</td><td>${h(p.client)}</td><td>${p.durationMonths?h(p.durationMonths)+' months':'—'}</td><td>${h(p.forecastFinish||p.plannedFinish||'—')}</td><td>${p.progress===null?'Not recorded':h(p.progress)+'%'}</td><td><button class="plink" data-project="${h(p.id)}">Open</button></td></tr>`).join('')}</tbody></table></div></div>`}
function report(){let scoped=reportCode==='all'?projects:projects.filter(p=>p.id===reportCode);return heading('Reporting','Portfolio report','Print or save a PDF from the current authenticated project records.',`<button class="btn primary" data-action="print">${ico('download')} Print / Save PDF</button><button class="btn" data-action="email">Prepare email draft</button>`)+`<section class="card panel no-print" style="margin-bottom:18px"><label class="sup-label" for="report-code">Report scope</label><select id="report-code" class="select-owner" style="display:block;margin-top:8px"><option value="all">${lead()?'Entire accessible portfolio':'All my assigned projects'}</option>${projects.map(p=>`<option value="${h(p.id)}" ${reportCode===p.id?'selected':''}>${h(p.id)} · ${h(p.client)}</option>`).join('')}</select><p class="source-line">Automatic email delivery and PDF attachments are not connected. Preparing an email draft does not send it.</p></section><section class="card panel report-sheet"><div class="eyebrow">Projects Control · Authorized report</div><h2 style="margin:7px 0 7px">${reportCode==='all'?'Project portfolio':h(scoped[0]?.client||'Project')}</h2><p class="source-line">Prepared: ${new Date().toLocaleString('en-GB')} · Issued for ${h(me.displayName)} (${h(roleName[me.role])}) · Currency amounts are not combined across denominations.</p><div class="table-wrap"><table><thead><tr><th>Project</th><th>Client</th><th>Value</th><th>Progress</th><th>Status</th></tr></thead><tbody>${scoped.map(p=>`<tr><td>${h(p.id)}</td><td>${h(p.client)}</td><td>${fmt(p.contractValue)} ${h(p.contractCurrency||'')}</td><td>${p.progress===null?'—':h(p.progress)+'%'}</td><td>${h(p.status||'—')}</td></tr>`).join('')}</tbody></table></div><p class="source-line" style="margin-top:15px">Source: Supabase ongoing-projects register. This is not a certified financial statement. Invoice, collections and monthly actuals are not yet mapped.</p></section>`}
function administration(){if(!admin())return overview();const users=adminData.users;const ownerOf=code=>{const a=adminData.assignments.filter(x=>x.project_code===code);return a.map(x=>users.find(u=>u.user_id===x.user_id)?.display_name||'Unknown user').join(', ')||'Unassigned'};return heading('Administration','Dashboard access','Profiles and assignments from Supabase; role and assignment edits are not activated in this phase.')+`<div class="cards">${kpi('Project records',String(projects.length),'Visible to Super Admin')}${kpi('User profiles',String(users.length),'Login activation pending')}${kpi('Team members',String(users.filter(x=>x.role==='team_member').length),'Confirmed profiles')}${kpi('Unassigned projects',String(projects.filter(p=>ownerOf(p.id)==='Unassigned').length),'No team-level access')}</div><div class="card tablecard"><div class="tablehead"><div><h2 class="paneltitle">Project assignments</h2><p class="panelmeta">Hassan and Super Admin can see all projects. Mohamed sees only 736 and 776 after Auth activation.</p></div></div><div class="table-wrap"><table><thead><tr><th>Code</th><th>Client</th><th>Team member</th></tr></thead><tbody>${projects.map(p=>`<tr><td>${h(p.id)}</td><td>${h(p.client)}</td><td>${h(ownerOf(p.id))}</td></tr>`).join('')}</tbody></table></div></div><div class="read-only-note" style="margin-top:18px">No Super Admin login has been activated yet. Role security is enforced by Supabase RLS, not by a browser role selector.</div>`}
function render(){ROOT.innerHTML=!me?loginView():layout(creating?newProjectView():chosen?(edit?editView():detail()):page==='overview'?overview():page==='projects'?projectsPage():page==='financials'?finance():page==='milestones'?milestones():page==='reports'?report():page==='admin'?administration():overview())}
function clearToast(){error='';notice=''}
ROOT.addEventListener('click',async e=>{
 const el=e.target.closest('button');if(!el)return;
 if(el.dataset.documentId){try{await downloadDocument(el.dataset.documentId,el.dataset.documentMode==='preview')}catch(err){setError(err)}return}
 if(el.dataset.budgetMonth){budgetEdit={type:'month',period:el.dataset.budgetMonth};render();return}
 if(el.dataset.budgetLine){budgetEdit={type:'line',id:Number(el.dataset.budgetLine)};render();return}
 if(el.dataset.aiPrompt){askAssistant(el.dataset.aiPrompt);return}
 if(el.dataset.page){chosen=null;edit=false;page=el.dataset.page;filter='';clearToast();render();return}
 if(el.dataset.project){await openProject(el.dataset.project);return}
 const action=el.dataset.action;
 if(action==='new-project'){creating=true;newProjectInputs={};numberDraft=null;uploadedContract=null;uploadedNumbers=null;chosen=null;page='projects';clearToast();render();return}
 if(action==='cancel-create'){creating=false;newProjectInputs={};numberDraft=null;uploadedContract=null;uploadedNumbers=null;render();return}
 if(action==='cancel-budget'){budgetEdit=null;render();return}
 if(action==='clear-ai'){aiMessages=[];render();return}
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
 if(!['login-form','edit-form','ai-form'].includes(e.target.id))return;e.preventDefault();clearToast();
 if(e.target.id==='login-form'){const f=new FormData(e.target);try{await login(String(f.get('email')||'').trim(),String(f.get('password')||''));render()}catch(err){setError(err)}return}
 if(e.target.id==='ai-form'){askAssistant(String(new FormData(e.target).get('question')||''));return}
 if(e.target.id==='edit-form'){
  const p=fromProject(chosen);if(!p)return;
  const f=new FormData(e.target),changes={};
  for(const k of ['contractValue','progress']){const str=String(f.get(k)||'').trim();const next=str===''?null:Number(str);if(next!==p[k])changes[k]=next}
  const status=String(f.get('status')||'');if(status!==p.status)changes.status=status;
  if(!Object.keys(changes).length){edit=false;showNotice('No changes to save.');return}
  try{const response=await api('/api/projects/'+encodeURIComponent(p.id),{method:'PUT',body:{lastEdited:p.lastEdited,changes}});const index=projects.findIndex(q=>q.id===p.id);if(index>=0)projects[index]=response.project;edit=false;showNotice(response.warning||`Project ${p.id} updated in Supabase.`)}catch(err){setError(err)}
 }
});
init();
