import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('./public/', import.meta.url));
const json = (res, status, data) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(data)); };
export const server = http.createServer(async (req,res) => {
 try {
  if(req.url === '/api/status') return json(res,200,{aiConfigured:!!process.env.GERETA_AI_KEY});
  if(req.url === '/api/chat' && req.method === 'POST') {
   if(!process.env.GERETA_AI_KEY) return json(res,503,{error:'AI API 키가 아직 설정되지 않았습니다. 현재는 화면 체험 버전입니다.'});
   let raw='';
   for await (const chunk of req) {raw+=chunk; if(Buffer.byteLength(raw)>100000) return json(res,413,{error:'요청이 너무 큽니다.'});}
   let body; try {body=JSON.parse(raw);} catch {return json(res,400,{error:'잘못된 요청입니다.'});}
   if(typeof body.character?.name!=='string'||typeof body.character?.persona!=='string'||!Array.isArray(body.messages)||!body.messages.length||body.messages.length>40||body.messages.some(m=>!['user','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>6000)) return json(res,400,{error:'대화 형식이 올바르지 않습니다.'});
   const upstream=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${process.env.GERETA_AI_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.GERETA_AI_MODEL||'gpt-4o-mini',messages:[{role:'system',content:`한국어로 대화하세요. 캐릭터 이름: ${body.character.name.slice(0,80)}. 설정: ${body.character.persona.slice(0,2000)}`},...body.messages],max_tokens:700}),signal:AbortSignal.timeout(45000)});
   if(!upstream.ok) return json(res,502,{error:'AI 서비스 요청에 실패했습니다. 서버의 API 키와 이용 한도를 확인해 주세요.'});
   const data=await upstream.json(); const reply=data.choices?.[0]?.message?.content;
   if(typeof reply!=='string') return json(res,502,{error:'AI 응답이 비어 있습니다.'});
   return json(res,200,{reply});
  }
  if(req.method!=='GET') return json(res,405,{error:'지원하지 않는 요청입니다.'});
  const paths={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};
  const file=paths[req.url?.split('?')[0]];
  if(!file) return json(res,404,{error:'찾을 수 없습니다.'});
  res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','X-Content-Type-Options':'nosniff'});
  res.end(await readFile(resolve(root,file)));
 } catch {json(res,500,{error:'요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'});}
});
if(process.argv[1] === fileURLToPath(import.meta.url)) server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Gereta listening on port '+(process.env.PORT||3000)));
