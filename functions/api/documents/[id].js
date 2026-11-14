import {handler,identity,rest,getProject,HttpError} from '../../_lib/core.js';
export async function onRequestGet({request,env,params}){return handler(async()=>{
 const u=await identity(request,env),id=String(params.id||'');
 if(!/^[0-9a-f-]{36}$/i.test(id))throw new HttpError(404,'Document not found');
 const rows=await rest(env,`project_documents?id=eq.${encodeURIComponent(id)}&select=id,project_code,document_type,original_name,original_media_type,original_storage_path,preview_pdf_path&limit=1`,{token:u.token});
 const doc=rows?.[0];if(!doc)throw new HttpError(404,'Document not available');
 await getProject(env,u,doc.project_code);
 const download=new URL(request.url).searchParams.get('download')==='1'||doc.document_type==='project_numbers';
 const path=download?doc.original_storage_path:(doc.preview_pdf_path||null);
 if(!path)throw new HttpError(409,'PDF preview is not available for this file. Download the original.');
 const upstream=await fetch(`${String(env.SUPABASE_URL).replace(/\/+$/,'')}/storage/v1/object/authenticated/project-documents/${path}`,{headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,authorization:`Bearer ${u.token}`},redirect:'manual'});
 if(!upstream.ok||upstream.status>=300)throw new HttpError(404,'Document not available');
 const safeName=doc.original_name.replace(/[^a-zA-Z0-9 _.,()-]/g,'_').slice(0,140);
 const contentType=download?doc.original_media_type:'application/pdf';
 const headers=new Headers({'Content-Type':contentType,'Content-Disposition':`${download?'attachment':'inline'}; filename="${download?safeName:'Contract.pdf'}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
 return new Response(upstream.body,{status:200,headers});
})}
