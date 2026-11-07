const pattern = /^[A-Za-z0-9_-]{43}$/;
const pendingKey = 'inova-licitacoes-sso-request';
const base64url = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const random = () => base64url(crypto.getRandomValues(new Uint8Array(32)));
function webUrl(value) {
  const url = new URL(value);
  if ((url.protocol!=='https:' && !(url.protocol==='http:' && ['127.0.0.1','localhost'].includes(url.hostname))) || url.username || url.password || url.search || url.hash) throw Error('Endereço de integração inválido');
  return url;
}
export function createInovaSso(config, client, lostAccess, requestPairing, makeLegacyClient) {
  const portal = webUrl(config.INOVA_SSO_PORTAL_URL);
  const api = webUrl(config.SUPABASE_URL);
  if (api.pathname !== '/') throw Error('Endereço do Supabase inválido');
  const endpoint = new URL('/functions/v1/inova-sso',api);
  let pendingPairing;
  let heartbeat;
  let renewing = false;
  async function send(payload, token) {
    const response = await fetch(endpoint,{
      method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
      body:JSON.stringify(payload),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000),
    });
    if (!response.ok) throw Error('Acesso ao INOVA Sistemas expirado ou indisponível.');
    return response.json();
  }
  async function start() {
    const state = random();
    const verifier = random();
    const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
    sessionStorage.setItem(pendingKey,JSON.stringify({state,verifier,expires:Date.now()+300000}));
    const url = new URL('/api/sso/start',portal);
    url.search = new URLSearchParams({state,challenge}).toString();
    location.replace(url);
  }
  async function enter() {
    const params = new URLSearchParams(location.hash.slice(1));
    if (!params.has('inova_code')) {
      await start();
      return null;
    }
    const code = params.get('inova_code');
    const state = params.get('state');
    const url = new URL(location.href);
    url.hash = '';
    url.searchParams.delete('inova_sso');
    history.replaceState(null,'',url);
    const pending = JSON.parse(sessionStorage.getItem(pendingKey)||'null');
    sessionStorage.removeItem(pendingKey);
    if (!pending || pending.expires < Date.now() || !pattern.test(code ?? '') || !pattern.test(state ?? '') || pending.state!==state || !pattern.test(pending.verifier)) throw Error('Solicitação expirada. Abra o portal novamente.');
    const exchange = {action:'exchange',code,verifier:pending.verifier};
    const result = await send(exchange);
    if (result.pairing_required === true) {
      pendingPairing = exchange;
      requestPairing();
      return null;
    }
    return install(result);
  }
  async function pair(email, password) {
    if (!pendingPairing) throw Error('Solicitação expirada.');
    const legacy = makeLegacyClient();
    const {data,error} = await legacy.auth.signInWithPassword({email,password});
    if (error || !data.session) throw Error('Não foi possível confirmar a conta de Licitações.');
    let result;
    try {
      result = await send(pendingPairing,data.session.access_token);
    } finally {
      await legacy.auth.signOut({scope:'local'}).catch(() => {});
    }
    pendingPairing = undefined;
    return install(result);
  }
  async function install(result) {
    if (typeof result.access_token !== 'string' || typeof result.refresh_token !== 'string') throw Error('Sessão inválida.');
    const {data,error} = await client.auth.setSession({access_token:result.access_token,refresh_token:result.refresh_token});
    if (error || !data.session) throw Error('Não foi possível iniciar a sessão.');
    heartbeat = setInterval(renew,15000);
    document.addEventListener('visibilitychange',visible);
    return data.session;
  }
  function stop() {
    clearInterval(heartbeat);
    document.removeEventListener('visibilitychange',visible);
  }
  function visible() { if (document.visibilityState==='visible') void renew(); }
  async function renew() {
    if (renewing) return;
    renewing = true;
    try {
      const {data,error} = await client.auth.getSession();
      if (error || !data.session) throw Error('Sessão expirada');
      await send({action:'renew'},data.session.access_token);
    } catch {
      stop();
      lostAccess('Sessão expirada. Volte ao portal para continuar.');
      await Promise.allSettled([client.removeAllChannels(),client.auth.signOut({scope:'local'})]);
    } finally {
      renewing = false;
    }
  }
  return {enter,pair,start,stop,portal:new URL('/sistemas',portal).href,logout:new URL('/sistemas/sair',portal).href};
}
