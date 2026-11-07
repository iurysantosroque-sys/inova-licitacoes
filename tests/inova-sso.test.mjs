import {test} from 'node:test';
import assert from 'node:assert/strict';
import {digest,random,signed,verified,trustedUrl,readJson} from '../supabase/functions/_shared/inova-sso.mjs';
const key=random();
test('backchannel vincula conteúdo, direção e prazo',async()=>{
 const time=100000;
 const envelope=await signed(key,'central-to-licitacoes',{action:'issue'},time);
 assert.deepEqual(await verified(key,'central-to-licitacoes',envelope,time),{action:'issue'});
 await assert.rejects(verified(key,'licitacoes-to-central',envelope,time));
 await assert.rejects(verified(key,'central-to-licitacoes',{...envelope,body:'{"action":"revoke"}'},time));
 await assert.rejects(verified(key,'central-to-licitacoes',envelope,time+30001));
 await assert.rejects(verified(random(),'central-to-licitacoes',envelope,time));
});
test('desafio S256 confere com o vetor de referência PKCE',async()=>{
 assert.equal(await digest('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});
test('URLs rejeitam credenciais, HTTP externo e destinos fornecidos por query',()=>{
 for(const url of ['http://outside.invalid','https://user:pass@outside.invalid','https://outside.invalid/?next=x','https://outside.invalid/#x','file:///x'])assert.throws(()=>trustedUrl(url));
 assert.equal(trustedUrl('http://127.0.0.1:3000').origin,'http://127.0.0.1:3000');
});
test('parser limita o corpo real mesmo sem Content-Length',async()=>{
 const request=new Request('https://example.invalid',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({body:'x'.repeat(5000)})});
 await assert.rejects(readJson(request));
});
