import {test,after,before} from 'node:test';
import assert from 'node:assert/strict';
import {server} from '../server.js';
let base;const oldKey=process.env.GERETA_AI_KEY;
before(async()=>{delete process.env.GERETA_AI_KEY;await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{await new Promise(r=>server.close(r));if(oldKey!==undefined)process.env.GERETA_AI_KEY=oldKey;});
test('serves the Korean application and JS',async()=>{const r=await fetch(base);assert.equal(r.status,200);assert.match(await r.text(),/캐릭터 발견/);assert.equal((await fetch(base+'/app.js')).status,200);});
test('reports missing AI configuration and fails honestly',async()=>{assert.deepEqual(await(await fetch(base+'/api/status')).json(),{aiConfigured:false});const r=await fetch(base+'/api/chat',{method:'POST',body:'{}'});assert.equal(r.status,503);assert.match((await r.json()).error,/API 키/);});
test('does not serve server code or environment files',async()=>{for(const path of ['/server.js','/.env','/package.json'])assert.equal((await fetch(base+path)).status,404);});
