const encoder = new TextEncoder();
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
export const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
export const opaque = value => typeof value === 'string' && tokenPattern.test(value);
export const encode = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
export const random = () => encode(crypto.getRandomValues(new Uint8Array(32)));
export const digest = async value => encode(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))));
export function trustedUrl(value) {
  const url = new URL(value);
  const local = ['127.0.0.1','localhost','[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash) throw Error('URL inválida');
  return url;
}
async function macKey(secret) {
  if (typeof secret !== 'string' || !opaque(secret)) throw Error('SSO indisponível');
  return crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign','verify']);
}
const material = (channel, time, body) => encoder.encode(JSON.stringify([channel,time,body]));
export async function signed(secret, channel, data, time = Date.now()) {
  const body = JSON.stringify(data);
  const signature = await crypto.subtle.sign('HMAC',await macKey(secret),material(channel,time,body));
  return {time, body, mac:encode(new Uint8Array(signature))};
}
export async function verified(secret, channel, envelope, now = Date.now()) {
  if (!envelope || !Number.isSafeInteger(envelope.time) || Math.abs(now-envelope.time)>30000 || typeof envelope.body!=='string' || envelope.body.length>2048 || !opaque(envelope.mac)) throw Error('Solicitação inválida');
  const mac = Uint8Array.from(atob(envelope.mac.replaceAll('-','+').replaceAll('_','/')+'='),c=>c.charCodeAt(0));
  if (!await crypto.subtle.verify('HMAC',await macKey(secret),mac,material(channel,envelope.time,envelope.body))) throw Error('Solicitação inválida');
  return JSON.parse(envelope.body);
}
export async function readJson(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw Error('Solicitação inválida');
  const reader = request.body?.getReader();
  if (!reader) throw Error('Solicitação inválida');
  const decoder = new TextDecoder();
  let text = '', count = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      count += value.length;
      if (count > 4096) throw Error('Solicitação inválida');
      text += decoder.decode(value,{stream:true});
    }
    return JSON.parse(text+decoder.decode());
  } finally {
    await reader.cancel().catch(()=>{});
  }
}
export async function backchannel(endpoint, secret, channel, data) {
  const response = await fetch(trustedUrl(endpoint),{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify(await signed(secret,channel,data)),redirect:'error',
    cache:'no-store',signal:AbortSignal.timeout(6500),
  });
  if (!response.ok) throw Error('SSO indisponível');
  return response.json();
}
export const json = (value, status=200, headers={}) => Response.json(value,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer',...headers}});
export function verifiedSessionId(token, userId) {
  const encoded = token.split('.')[1];
  const claims = JSON.parse(atob(encoded.replaceAll('-','+').replaceAll('_','/')));
  if (claims.sub !== userId || !uuid(claims.session_id)) throw Error('Sessão inválida');
  return claims.session_id;
}
