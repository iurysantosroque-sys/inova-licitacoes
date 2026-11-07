import { createClient } from 'npm:@supabase/supabase-js@2.112.3';
import { backchannel, digest, json, opaque, random, readJson, trustedUrl, uuid, verified, verifiedSessionId } from '../_shared/inova-sso.mjs';

const options = {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
async function checked(query: PromiseLike<{data: any; error: unknown}>) {
  const result = await query;
  if (result.error) throw Error('Operação indisponível');
  return result.data;
}

function bearer(request: Request) {
  const value = request.headers.get('authorization') ?? '';
  return /^Bearer [^ ]+$/.test(value) && value.length <= 8192 ? value.slice(7) : null;
}

Deno.serve(async request => {
  const secret = Deno.env.get('INOVA_SSO_SECRET');
  const api = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY');
  const origin = request.headers.get('origin');
  const cors: Record<string,string> = {Vary:'Origin'};
  try {
    if (Deno.env.get('INOVA_SSO_ENABLED') !== 'true' || !api || !key || !publicKey || !secret) return json({},503);
    const allowedOrigin = trustedUrl(Deno.env.get('INOVA_SSO_BROWSER_ORIGIN') ?? '').origin;
    if (origin && origin !== allowedOrigin) return json({},403,cors);
    if (origin) cors['Access-Control-Allow-Origin'] = allowedOrigin;
    if (request.method === 'OPTIONS' && origin) {
      return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'content-type, authorization','Cache-Control':'no-store'}});
    }
    if (request.method !== 'POST') return json({},405,cors);
    const body = await readJson(request);
    const service = createClient(api,key,options);
    const centralUrl = Deno.env.get('INOVA_SSO_STATUS_URL') ?? '';
    async function active(user: string, session: string): Promise<string> {
      const {startedAt} = await backchannel(centralUrl,secret!,'licitacoes-to-central',{action:'status',user,session});
      if (typeof startedAt !== 'string' || !Number.isFinite(Date.parse(startedAt))) throw Error('Sessão expirada');
      return startedAt;
    }
    if (!origin) {
      const message = await verified(secret,'central-to-licitacoes',body);
      if (!uuid(message.user)) return json({},400);
      if (message.action === 'revoke') {
        await checked(service.rpc('inova_sso_revoke',{p_central_user:message.user,p_cutoff:message.cutoff}));
        return json({ok:true});
      }
      if (message.action !== 'issue' || !uuid(message.session) || !opaque(message.challenge)) return json({},400);
      const startedAt = await active(message.user,message.session);
      const code = random();
      const allowed = await checked(service.rpc('inova_sso_issue',{
        p_hash:await digest(code),p_challenge:message.challenge,p_central_user:message.user,
        p_central_session:message.session,p_started_at:startedAt,
      }));
      return allowed ? json({code}) : json({},403);
    }
    const userApi = createClient(api,publicKey,options);
    if (body.action === 'exchange' && opaque(body.code) && opaque(body.verifier)) {
      const proof = {
        p_hash:await digest(body.code),p_challenge:await digest(body.verifier),
      };
      const take = () => checked(service.rpc('inova_sso_take',proof));
      let [grant] = await take();
      if (!grant) {
        const [intent] = await checked(service.rpc('inova_sso_pair_intent',proof));
        if (!intent) return json({},401,cors);
        const startedAt = await active(intent.central_user,intent.central_session);
        const token = bearer(request);
        if (!token) return request.headers.has('authorization')
          ? json({},401,cors) : json({pairing_required:true},200,cors);
        const {user} = await checked(userApi.auth.getUser(token));
        if (!user) return json({},401,cors);
        const paired = await checked(service.rpc('inova_sso_pair',{
          ...proof,p_central_user:intent.central_user,p_started_at:startedAt,p_local_user:user.id,
          p_local_session:verifiedSessionId(token,user.id),
        }));
        if (!paired) return json({},401,cors);
        [grant] = await take();
      }
      if (!grant || !grant.email) return json({},401,cors);
      const startedAt = await active(grant.central_user,grant.central_session);
      const link = await checked(service.auth.admin.generateLink({type:'magiclink',email:grant.email}));
      if (link.user.id !== grant.local_user) throw Error('Identidade divergente');
      // This native Auth verifier stays on the server. No email is sent.
      const result = await checked(userApi.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}));
      const session = result.session;
      if (!session || result.user?.id !== grant.local_user) throw Error('Identidade divergente');
      const admitted = await checked(service.rpc('inova_sso_admit',{
        p_local_user:grant.local_user,p_local_session:verifiedSessionId(session.access_token,grant.local_user),
        p_central_user:grant.central_user,p_central_session:grant.central_session,p_started_at:startedAt,
      }));
      if (!admitted) throw Error('Sessão revogada');
      return json({access_token:session.access_token,refresh_token:session.refresh_token},200,cors);
    }
    if (body.action === 'renew') {
      const token = bearer(request);
      if (!token) return json({},401,cors);
      const {user} = await checked(userApi.auth.getUser(token));
      if (!user) return json({},401,cors);
      const localSession = verifiedSessionId(token,user.id);
      const [lease] = await checked(service.rpc('inova_sso_lease',{p_local_user:user.id,p_local_session:localSession}));
      if (!lease) return json({},401,cors);
      const startedAt = await active(lease.central_user,lease.central_session);
      const renewed = await checked(service.rpc('inova_sso_admit',{
        p_local_user:user.id,p_local_session:localSession,p_central_user:lease.central_user,
        p_central_session:lease.central_session,p_started_at:startedAt,
      }));
      return renewed ? json({ok:true},200,cors) : json({},401,cors);
    }
    return json({},400,cors);
  } catch {
    return json({},401,cors);
  }
});
