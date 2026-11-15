import test from 'node:test';
import assert from 'node:assert/strict';
import {readRecoveryFragment,validateRecoveryPassword} from '../public/recovery-utils.js';
import {createPasswordRecovery} from '../public/password-recovery.js';

const token='a'.repeat(48)+'.'+'b'.repeat(60)+'.'+'c'.repeat(32);

test('recovery fragment parser accepts only recovery tokens and rejects invalid links',()=>{
 assert.equal(readRecoveryFragment(''),null);
 assert.equal(readRecoveryFragment('#hello=world'),null);
 assert.deepEqual(readRecoveryFragment('#type=recovery&access_token='+token),{kind:'token',accessToken:token});
 assert.deepEqual(readRecoveryFragment('#type=recovery&access_token=invalid'),{kind:'invalid'});
 assert.deepEqual(readRecoveryFragment('#error=access_denied&error_code=otp_expired'),{kind:'invalid'});
});

test('password validation enforces length and confirmation without storing passwords',()=>{
 assert.match(validateRecoveryPassword('short','short'),/12 characters/);
 assert.match(validateRecoveryPassword('longpassword123','differentpass123'),/do not match/);
 assert.equal(validateRecoveryPassword('longpassword123','longpassword123'),'');
});

function setup(hash=''){
 const old={window:globalThis.window,sessionStorage:globalThis.sessionStorage,document:globalThis.document,fetch:globalThis.fetch,FormData:globalThis.FormData};
 const removed=[],rewritten=[],requests=[];
 globalThis.window={
  location:{origin:'https://example.pages.dev',pathname:'/',search:'',hash},
  history:{replaceState(_a,_b,url){rewritten.push(url);}}
 };
 globalThis.document={getElementById:()=>null};
 globalThis.sessionStorage={removeItem(k){removed.push(k)},setItem(){throw Error('Recovery must not store secrets')}};
 globalThis.FormData=class{constructor(form){this.form=form}get(k){return this.form[k]}};
 let respond=async()=>({ok:true,json:async()=>({id:'test-user',email:'test@example.com'})});
 globalThis.fetch=async(url,opts={})=>{requests.push({url:String(url),opts});return respond(url,opts)};
 return {
  removed,rewritten,requests,
  respond(fn){respond=fn},
  restore(){Object.assign(globalThis,old)}
 };
}

test('opening a recovery link clears URL and old session, and verifies bearer',async()=>{
 const mock=setup('#access_token='+token+'&type=recovery');
 try{
  const flow=createPasswordRecovery({getConfig:()=>({supabaseUrl:'https://project.supabase.co',publishableKey:'public-key'}),render:()=>{}});
  assert.equal(flow.mode,'verifying');
  assert.deepEqual(mock.rewritten,['/']);
  assert.deepEqual(mock.removed,['projectsControlSession']);
  await flow.bootstrap();
  assert.equal(flow.mode,'set');
  assert.equal(mock.requests[0].url,'https://project.supabase.co/auth/v1/user');
  assert.equal(mock.requests[0].opts.headers.Authorization,'Bearer '+token);
 }finally{mock.restore()}
});

test('forgot password requests use exact return URL and generic success message',async()=>{
 const mock=setup();
 try{
  const flow=createPasswordRecovery({getConfig:()=>({supabaseUrl:'https://project.supabase.co',publishableKey:'public-key'}),render:()=>{}});
  flow.open();
  await flow.submit({id:'recovery-request-form',email:'TEST@example.com'});
  assert.equal(flow.mode,'sent');
  const sent=mock.requests[0];
  assert.equal(new URL(sent.url).searchParams.get('redirect_to'),'https://example.pages.dev/');
  assert.equal(JSON.parse(sent.opts.body).email,'test@example.com');
  assert.equal(sent.opts.method,'POST');
  assert.match(flow.view(),/If the address is registered/);
 }finally{mock.restore()}
});

test('set password uses recovered bearer, signs out and never auto-logs in',async()=>{
 const mock=setup('#access_token='+token+'&type=recovery');
 try{
  const flow=createPasswordRecovery({getConfig:()=>({supabaseUrl:'https://project.supabase.co',publishableKey:'public-key'}),render:()=>{}});
  await flow.bootstrap();
  await flow.submit({id:'recovery-set-form',password:'some-long-new-password!',confirmation:'some-long-new-password!'});
  assert.equal(flow.mode,'complete');
  const put=mock.requests.find(x=>x.opts.method==='PUT');
  assert.equal(put.url,'https://project.supabase.co/auth/v1/user');
  assert.equal(put.opts.headers.Authorization,'Bearer '+token);
  assert.equal(JSON.parse(put.opts.body).password,'some-long-new-password!');
  assert.ok(mock.requests.some(x=>x.url.endsWith('/auth/v1/logout?scope=global')));
  assert.match(flow.view(),/Sign in with your email and new password/);
 }finally{mock.restore()}
});

test('expired recovery token never shows password form',async()=>{
 const mock=setup('#access_token='+token+'&type=recovery');
 try{
  mock.respond(async()=>({ok:false,status:401,json:async()=>({})}));
  const flow=createPasswordRecovery({getConfig:()=>({supabaseUrl:'https://project.supabase.co',publishableKey:'public-key'}),render:()=>{}});
  await flow.bootstrap();
  assert.equal(flow.mode,'invalid');
  assert.doesNotMatch(flow.view(),/id="recovery-set-form"/);
 }finally{mock.restore()}
});
