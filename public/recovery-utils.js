/* Client-side helpers for Supabase email password recovery.
 * Tokens remain in memory only; never serialize a recovery token into storage.
 */
export function readRecoveryFragment(hash) {
 const raw=String(hash||'');
 if(!raw.startsWith('#'))return null;
 const params=new URLSearchParams(raw.slice(1));
 if(params.get('type')==='recovery'){
  const accessToken=params.get('access_token')||'';
  return /^[A-Za-z0-9._-]{32,8192}$/.test(accessToken)
   ?{kind:'token',accessToken}
   :{kind:'invalid'};
 }
 if(params.has('error')||params.has('error_code'))return {kind:'invalid'};
 return null;
}

export function validateRecoveryPassword(password,confirmation) {
 if(typeof password!=='string'||password.length<12)return 'Use a password with at least 12 characters.';
 if(password!==confirmation)return 'The passwords do not match.';
 return '';
}
