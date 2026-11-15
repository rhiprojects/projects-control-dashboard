import {readRecoveryFragment,validateRecoveryPassword} from './recovery-utils.js';

/* Supabase Auth recovery, isolated from normal portal sessions.
 * No recovery credential is placed in sessionStorage, cookies or a URL.
 */
export function createPasswordRecovery({getConfig,render}) {
 const callback=readRecoveryFragment(window.location.hash);
 let mode=callback?(callback.kind==='token'?'verifying':'invalid'):'login';
 let token=callback?.kind==='token'?callback.accessToken:null;
 let busy=false;
 let message='';

 if(callback){
  // Supabase implicit recovery links contain credentials in the fragment.
  // Clear them synchronously before loading configuration or other resources.
  window.history.replaceState(null,'',window.location.pathname+window.location.search);
  try{sessionStorage.removeItem('projectsControlSession');}catch{}
 }

 const safe=value=>String(value??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
 }[char]));
 const base=()=>String(getConfig()?.supabaseUrl||'').replace(/\/+$/,'');
 const headers=()=>({apikey:getConfig().publishableKey});

 async function bootstrap() {
  if(mode!=='verifying')return;
  try {
   const response=await fetch(base()+'/auth/v1/user',{
    headers:{...headers(),Authorization:'Bearer '+token},cache:'no-store'
   });
   const user=response.ok?await response.json():null;
   if(user?.id&&user?.email){mode='set';}
   else {mode='invalid';token=null;}
  }catch{mode='invalid';token=null;}
 }

 function open() {
  mode='request';token=null;busy=false;message='';
  render();document.getElementById('recovery-email')?.focus();
 }
 function back() {
  mode='login';token=null;busy=false;message='';
  render();document.getElementById('email')?.focus();
 }

 function view() {
  const brand='<div class="login-logo"><span class="brandmark">R</span><div class="brandname">RHI<small>PROJECTS CONTROL DASHBOARD</small></div></div>';
  const alert=message?'<p class="recovery-error" role="alert">'+safe(message)+'</p>':'';
  let contents='';
  if(mode==='request') {
   contents='<h1 class="login-title">Forgot password?</h1>'+
    '<p class="login-desc">Enter your portal email address to request a secure password reset link.</p>'+
    '<form id="recovery-request-form"><div class="login-field"><label for="recovery-email">Email address</label>'+
    '<input id="recovery-email" name="email" type="email" autocomplete="email" required maxlength="254" placeholder="name@company.com"></div>'+
    alert+'<button class="btn primary login-button" type="submit"'+(busy?' disabled':'')+'>'+(busy?'Sending…':'Send reset link')+'</button></form>';
  }else if(mode==='sent'){
   contents='<h1 class="login-title">Check your email</h1>'+
    '<p class="login-desc" role="status">If the address is registered, a password reset link has been requested. Check the inbox and spam folder.</p>';
  }else if(mode==='verifying'){
   contents='<h1 class="login-title">Verifying recovery link</h1>'+
    '<p class="login-desc" role="status">Checking your password recovery link…</p>';
  }else if(mode==='set'){
   contents='<h1 class="login-title">Set new password</h1>'+
    '<p class="login-desc">Use at least 12 characters. You will sign in again after updating your password.</p>'+
    '<form id="recovery-set-form"><div class="login-field"><label for="recovery-password">New password</label>'+
    '<input id="recovery-password" name="password" type="password" autocomplete="new-password" required minlength="12" maxlength="256"></div>'+
    '<div class="login-field"><label for="recovery-confirm">Confirm new password</label>'+
    '<input id="recovery-confirm" name="confirmation" type="password" autocomplete="new-password" required minlength="12" maxlength="256"></div>'+
    alert+'<button class="btn primary login-button" type="submit"'+(busy?' disabled':'')+'>'+(busy?'Updating…':'Set new password')+'</button></form>';
  }else if(mode==='complete'){
   contents='<h1 class="login-title">Password updated</h1>'+
    '<p class="login-desc" role="status">Your password has been changed. Sign in with your email and new password.</p>';
  }else{
   contents='<h1 class="login-title">Link expired or invalid</h1>'+
    '<p class="login-desc" role="alert">This recovery link is invalid or has expired. Please request a new link.</p>'+
    '<button class="btn primary login-button" type="button" data-action="recovery-open">Request new link</button>';
  }
  return '<div class="login-wrap"><section class="login-card recovery-card">'+brand+contents+
   '<div class="recovery-footer"><button class="recovery-link" type="button" data-action="recovery-back">Back to sign in</button></div>'+
   '</section></div>';
 }

 async function submit(form) {
  if(busy)return;
  if(form.id==='recovery-request-form'&&mode==='request'){
   const email=String(new FormData(form).get('email')||'').trim().toLowerCase();
   if(!email)return;
   busy=true;message='';render();
   try {
    const url=new URL(base()+'/auth/v1/recover');
    // Add this exact origin to Supabase Authentication > URL Configuration.
    url.searchParams.set('redirect_to',window.location.origin+'/');
    const response=await fetch(url.toString(),{
     method:'POST',headers:{...headers(),'content-type':'application/json'},
     body:JSON.stringify({email}),cache:'no-store'
    });
    if(!response.ok)throw new Error('Recovery email unavailable');
    mode='sent';
   }catch{message='Unable to send a password reset email right now. Please try again later.';}
   finally{busy=false;render();}
   return;
  }
  if(form.id==='recovery-set-form'&&mode==='set'&&token){
   const fields=new FormData(form);
   const password=String(fields.get('password')||'');
   const confirmation=String(fields.get('confirmation')||'');
   const issue=validateRecoveryPassword(password,confirmation);
   if(issue){message=issue;render();return;}
   busy=true;message='';render();
   try{
    const bearer=token;
    const response=await fetch(base()+'/auth/v1/user',{
     method:'PUT',headers:{...headers(),Authorization:'Bearer '+bearer,'content-type':'application/json'},
     body:JSON.stringify({password}),cache:'no-store'
    });
    if(response.ok){
     token=null;
     mode='complete';
     // Revoke outstanding sessions; this recovery token never becomes a portal login.
     try{await fetch(base()+'/auth/v1/logout?scope=global',{
      method:'POST',headers:{...headers(),Authorization:'Bearer '+bearer},cache:'no-store'
     });}catch{}
    }else if(response.status===401||response.status===403){
     token=null;mode='invalid';
    }else{
     message='Unable to update your password. Try another password or request a fresh link.';
    }
   }catch{message='Unable to update your password right now. Please try again.';}
   finally{busy=false;render();}
  }
 }

 return {get active(){return mode!=='login';},get mode(){return mode;},open,back,bootstrap,view,submit};
}
