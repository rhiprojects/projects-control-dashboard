import {handler,identity,rest,getProject,json,HttpError,code} from '../_lib/core.js';
export async function onRequestGet({request,env}){return handler(async()=>{const u=await identity(request,env),url=new URL(request.url),p=code(url.searchParams.get('project')||'');await getProject(env,u,p);const rows=await rest(env,`project_documents?project_code=eq.${encodeURIComponent(p)}&select=id,project_code,document_type,original_name,original_media_type,preview_pdf_path,uploaded_at,uploaded_by,confirmed_at&order=uploaded_at.desc`,{token:u.token});return json({documents:rows||[]})})}
export async function onRequestPost({request,env}){return handler(async()=>{
 const u=await identity(request,env),url=new URL(request.url),p=code(url.searchParams.get('project')||'');
 await getProject(env,u,p);
 const type=url.searchParams.get('type');
 if(!['contract','project_numbers'].includes(type))throw new HttpError(400,'Choose Contract or Project Numbers');
 let name;try{name=decodeURIComponent(request.headers.get('x-file-name')||'')}catch{throw new HttpError(400,'Invalid filename')}
 name=name.split(/[\/\\]/).pop().trim().slice(0,180);
 const ext=(name.split('.').pop()||'').toLowerCase();
 const types={pdf:'application/pdf',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',xls:'application/vnd.ms-excel',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',doc:'application/msword'};
 if(!types[ext]||name.length<5)throw new HttpError(400,'Upload an Excel, PDF, or Word document');
 const length=Number(request.headers.get('content-length')||0);
 if(length>20*1024*1024)throw new HttpError(413,'File is larger than 20 MB');
 const raw=await request.arrayBuffer();
 if(!raw.byteLength||raw.byteLength>20*1024*1024)throw new HttpError(413,'Upload a file under 20 MB');
 const path=p+'/'+crypto.randomUUID()+'.'+ext;
 const upstream=await fetch(`${String(env.SUPABASE_URL).replace(/\/+$/,'')}/storage/v1/object/project-documents/${path}`,{method:'POST',redirect:'manual',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,authorization:`Bearer ${u.token}`,'content-type':types[ext],'x-upsert':'false'},body:raw});
 if(!upstream.ok||upstream.status>=300)throw new HttpError(upstream.status===403?403:502,'Unable to store document');
 const documents=await rest(env,'project_documents?select=id,project_code,document_type,original_name,original_media_type,preview_pdf_path,uploaded_at,confirmed_at',{token:u.token,method:'POST',body:{project_code:p,document_type:type,original_name:name,original_media_type:types[ext],original_storage_path:path,preview_pdf_path:ext==='pdf'&&type==='contract'?path:null,uploaded_by:u.profileId}});
 if(!documents||documents.length!==1)throw new HttpError(502,'Document metadata was not saved');
 return json({document:documents[0]},201);
})}
