// Simple, text-first PDF preview for Word contracts. Original files are never modified.
function escapePdf(s){return s.replace(/[\\()]/g,c=>'\\'+c);}
export function wordPreviewPdf(input){
 const lines=[];for(const raw of String(input||'').slice(0,30000).split(/\r?\n/)){
  let str=raw.replace(/[^\x20-\x7e]/g,'?');
  while(str.length>0){lines.push(str.slice(0,94));str=str.slice(94);}
  if(!raw)lines.push('');
 }
 const pages=[];for(let i=0;i<lines.length;i+=53)pages.push(lines.slice(i,i+53));if(!pages.length)pages.push(['']);
 let objects=[null,'<< /Type /Catalog /Pages 2 0 R >>',null,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 const pageIDs=[];
 for(const page of pages){
  const pageId=objects.length,contentId=pageId+1;pageIDs.push(pageId);
  objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`);
  const content='BT /F1 9 Tf 42 748 Td 12 TL '+page.map((x,i)=>`${i?'T* ':''}(${escapePdf(x)}) Tj`).join(' ')+' ET';
  objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
 }
 objects[2]=`<< /Type /Pages /Kids [${pageIDs.map(id=>id+' 0 R').join(' ')}] /Count ${pages.length} >>`;
 let out='%PDF-1.4\n',offsets=[0];
 for(let i=1;i<objects.length;i++){offsets.push(out.length);out+=`${i} 0 obj\n${objects[i]}\nendobj\n`;}
 const xref=out.length;out+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;
 for(let i=1;i<offsets.length;i++)out+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
 out+=`trailer << /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
 return new TextEncoder().encode(out);
}
