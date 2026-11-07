import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createInovaSso } from '../sso-client.js';

const config = {
  INOVA_SSO_PORTAL_URL: 'https://portal.test',
  SUPABASE_URL: 'https://licitacoes-api.test',
};
const callback = 'https://licitacoes.test/licitacoes/?inova_sso=1';
const code = 'g'.repeat(43);
const nativeSession = {access_token:'sso-native',refresh_token:'refresh-native',user:{id:'ficticio'}};

function fixture(t, respond) {
  const restore = new Map();
  t.after(() => {
    for (const [name, descriptor] of restore) {
      if (descriptor) Object.defineProperty(globalThis,name,descriptor);
      else delete globalThis[name];
    }
  });
  function global(name, value) {
    restore.set(name,Object.getOwnPropertyDescriptor(globalThis,name));
    Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});
  }
  const memory = new Map(), requests = [], events = [];
  const browser = {href:callback,hash:'',replace(url){this.destination=String(url);}};
  global('location',browser);
  global('history',{replaceState(_state,_title,url){browser.href=String(url);browser.hash=new URL(url).hash;}});
  global('sessionStorage',{
    setItem:(k,v)=>memory.set(k,v),getItem:k=>memory.get(k)??null,removeItem:k=>memory.delete(k),
  });
  global('document',{visibilityState:'visible',addEventListener(){},removeEventListener(){}});
  global('setInterval',fn=>{browser.renew=fn;return 1;});
  global('clearInterval',()=>{browser.renew=undefined;});
  global('fetch',async (url, options) => {
    const request = {url:String(url),body:JSON.parse(options.body),token:options.headers.Authorization};
    requests.push(request);
    return respond(request);
  });
  const client = {
    removeAllChannels:async()=>events.push('channels removed'),
    auth:{
      setSession:async tokens=>{events.push(tokens.access_token);return {data:{session:nativeSession}};},
      getSession:async()=>({data:{session:nativeSession}}),
      signOut:async()=>events.push('signed out'),
    },
  };
  const proof = {auth:{
    signInWithPassword:async ({email,password})=>{
      events.push('legacy checked');
      assert.equal(email,'conta@test.invalid');
      if(password!=='senha fictícia') return {error:true,data:{}};
      return {data:{session:{access_token:'legacy-native'}}};
    },
    signOut:async()=>events.push('proof discarded'),
  }};
  const flow = createInovaSso(config,client,()=>events.push('access lost'),
    ()=>events.push('pairing shown'),()=>proof);
  async function initiate(state) {
    assert.equal(await flow.enter(),null);
    const destination=new URL(browser.destination);
    assert.equal(destination.origin,'https://portal.test');
    assert.equal(destination.pathname,'/api/sso/start');
    const expected=destination.searchParams.get('state');
    browser.hash='#inova_code='+code+'&state='+(state??expected);
    browser.href=callback+browser.hash;
  }
  return {flow,initiate,browser,requests,events,memory};
}

test('uma única confirmação da conta antiga instala a sessão nativa e descarta a prova',async t=>{
  const f=fixture(t,request=>new Response(JSON.stringify(request.token ? nativeSession : {pairing_required:true})));
  await f.initiate();
  assert.equal(await f.flow.enter(),null);
  assert.deepEqual(f.events,['pairing shown']);
  assert.equal(f.memory.size,0);
  assert.equal(f.browser.hash,'');
  await assert.rejects(f.flow.pair('conta@test.invalid','senha errada'));
  assert.equal(f.requests.length,1);
  assert.equal(await f.flow.pair('conta@test.invalid','senha fictícia'),nativeSession);
  assert.deepEqual(f.events,['pairing shown','legacy checked','legacy checked','proof discarded','sso-native']);
  assert.equal(f.requests[1].token,'Bearer legacy-native');
  assert.equal(f.requests[1].url,'https://licitacoes-api.test/functions/v1/inova-sso');
  assert.deepEqual(f.requests[1].body,f.requests[0].body);
  assert.equal(JSON.stringify(f.requests).includes('senha fictícia'),false);
  await assert.rejects(f.flow.pair('conta@test.invalid','senha fictícia'),/expirada/);
});

test('conta vinculada reutiliza o portal e perde acesso quando a renovação é negada',async t=>{
  const f=fixture(t,request=>request.body.action==='renew'
    ? new Response(null,{status:401}) : new Response(JSON.stringify(nativeSession)));
  await f.initiate();
  assert.equal(await f.flow.enter(),nativeSession);
  assert.deepEqual(f.events,['sso-native']);
  assert.equal(f.requests[0].token,undefined);
  await f.browser.renew();
  assert.equal(f.requests[1].token,'Bearer sso-native');
  assert.deepEqual(f.events,['sso-native','access lost','channels removed','signed out']);
  assert.equal(f.flow.logout,'https://portal.test/sistemas/sair');
});

test('estado divergente não envia requisição e remove fragmento e prova',async t=>{
  const f=fixture(t,()=>{throw Error('não deve chamar o broker');});
  await f.initiate('z'.repeat(43));
  await assert.rejects(f.flow.enter(),/expirada/);
  assert.equal(f.requests.length,0);
  assert.equal(f.browser.hash,'');
  assert.equal(f.memory.size,0);
});
