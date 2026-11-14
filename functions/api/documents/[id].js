import {handler,identity,rest,HttpError} from '../../_lib/core.js';
export function onRequestGet({request,env,params}){return handler(async()=>{
 const user=await identity(request,env),id=String(params.id||''),url=new URL(request.url);
 if(!/^[a-f0-9-]{36}$/i.test(id))throw new HttpError(404,'File not found');
 const rows=await rest(env,`project_documents?id=eq.${id}&select=id,original_name,original_media_type,original_storage_path,preview_pdf_path,document_type&limit=1`,{token:user.token});
 if(!rows.length)throw new HttpError(404,'File not available');
 const doc=rows[0],preview=url.searchParams.get('view')==='pdf';
 if(preview&&(doc.document_type!=='contract'||!doc.preview_pdf_path))throw new HttpError(404,'PDF preview unavailable');
 const path=preview?doc.preview_pdf_path:doc.original_storage_path;
 const target=String(env.SUPABASE_URL||'').replace(/\/$/,'')+'/storage/v1/object/authenticated/project-documents/'+path;
 const response=await fetch(target,{redirect:'manual',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,authorization:'Bearer '+user.token}});
 if(!response.ok)throw new HttpError(404,'File unavailable');
 const filename=preview?'Contract.pdf':doc.original_name.replace(/[\r\n"\\]/g,'_');
 return new Response(response.body,{status:200,headers:{
  'content-type':preview?'application/pdf':doc.original_media_type,
  'content-disposition':(preview?'inline':'attachment')+'; filename="'+filename+'"',
  'cache-control':'private, no-store','x-content-type-options':'nosniff'
 }});
})}
