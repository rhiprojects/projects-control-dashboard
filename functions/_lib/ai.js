// The private Cloudflare service binding keeps AI credentials out of the client.
export const hasAI=env=>Boolean(env.AI?.run||env.AI_SERVICE?.fetch);
export async function aiRun(env,model,params){
 if(env.AI?.run)return env.AI.run(model,params);
 if(!env.AI_SERVICE?.fetch)throw new Error('AI service unavailable');
 const res=await env.AI_SERVICE.fetch('https://rhi-internal/run',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,params})});
 if(!res.ok)throw new Error('AI inference unavailable');
 return res.json();
}
export async function aiMarkdown(env,name,bytes){
 if(env.AI?.toMarkdown)return env.AI.toMarkdown({name,blob:new Blob([bytes])});
 if(!env.AI_SERVICE?.fetch)throw new Error('AI conversion unavailable');
 const file=new File([bytes],name,{type:'application/octet-stream'});
 const form=new FormData();form.set('file',file);
 const res=await env.AI_SERVICE.fetch('https://rhi-internal/markdown',{method:'POST',body:form});
 if(!res.ok)throw new Error('Document conversion unavailable');
 return res.json();
}
