// Transporte de servidor. Testes usam respostas explicitamente fictícias, nunca resultados oficiais.
export function validateSerproConfig(config,companyId){
 if(!config||config.companyId!==companyId||!config.consumerKey||!config.consumerSecret||!config.authorizationReference||config.allowBillableIssuance!==true)throw Error('SERPRO_CONFIGURATION_REQUIRED');
 let url;try{url=new URL(config.endpoint);}catch{throw Error('SERPRO_CONFIGURATION_REQUIRED');}
 if(url.protocol!=='https:'||url.hostname!=='gateway.apiserpro.serpro.gov.br'||url.port||url.username||url.password||url.search||url.hash||!url.pathname.startsWith('/consulta-cnd/')||/trial|demo/i.test(url.pathname))throw Error('SERPRO_CONFIGURATION_REQUIRED');return url.href;
}
const civil=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}/.test(value)?value.slice(0,10):null;
export function decodeOfficialCertificate(body,cnpj){
 const status=Number(body?.Status);if([3,4].includes(status))return {outcome:'not_issued',status,reason:'A fonte oficial não emitiu a certidão. Consulte a situação no portal.'};
 if([5,6].includes(status))return {outcome:'retry',status,reason:'Base oficial temporariamente indisponível.'};
 if(status===7)return {outcome:'processing',status,key:typeof body.Chave==='string'?body.Chave:null};
 if(![1,2].includes(status))throw Error('SERPRO_INVALID_RESPONSE');
 const cert=body.Certidao;if(!cert||cert.TipoContribuinte!==1||cert.ContribuinteCertidao!==cnpj)throw Error('SERPRO_TAXPAYER_MISMATCH');
 const issuedOn=civil(cert.DataEmissao),expiresOn=civil(cert.DataValidade),control=String(cert.CodigoControle||'').trim();
 if(!issuedOn||!expiresOn||issuedOn>expiresOn||!control||control.length>100||![1,2].includes(cert.TipoCertidao))throw Error('SERPRO_INVALID_CERTIFICATE');
 if(new Date(issuedOn+'T00:00:00Z').toISOString().slice(0,10)!==issuedOn||new Date(expiresOn+'T00:00:00Z').toISOString().slice(0,10)!==expiresOn)throw Error('SERPRO_INVALID_CERTIFICATE');
 const base64=cert.DocumentoPdf;if(typeof base64!=='string'||base64.length<8||base64.length>36*1024*1024||!/^[A-Za-z0-9+/\r\n]*={0,2}$/.test(base64))throw Error('SERPRO_PDF_REQUIRED');
 let bytes;try{bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));}catch{throw Error('SERPRO_PDF_REQUIRED');}
 if(bytes.length>25*1024*1024||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-'||!new TextDecoder().decode(bytes.slice(-2048)).includes('%%EOF'))throw Error('SERPRO_PDF_REQUIRED');
 return {outcome:status===1?'official_found':'official_issued',status,certificate:{taxpayer:cnpj,control,issued_on:issuedOn,expires_on:expiresOn,certificate_type:cert.TipoCertidao},bytes};
}
export async function requestSerproCertificate({config,companyId,profile,authorizeBillableIssuance,fetchImpl=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms))}){
 const endpoint=validateSerproConfig(config,companyId);
 const overall=AbortSignal.timeout(42000);
 if(authorizeBillableIssuance!==true||!profile?.confirmed_at||profile.company_id!==companyId||!/^[A-Z0-9]{12}[0-9]{2}$/.test(profile.cnpj||''))throw Error('SERPRO_AUTHORIZATION_REQUIRED');
 const request=async(url,options)=>{let response;try{response=await fetchImpl(url,{...options,redirect:'error',signal:AbortSignal.any([overall,AbortSignal.timeout(12000)])});}catch{throw Error('SERPRO_NETWORK_UNCERTAIN');}if(!response.ok&&![201,202].includes(response.status)){if(response.status===429)throw Error('SERPRO_RATE_LIMIT');if([401,403].includes(response.status))throw Error('SERPRO_CREDENTIALS_REJECTED');throw Error('SERPRO_UNAVAILABLE');}if(!response.headers.get('content-type')?.includes('application/json'))throw Error('SERPRO_INVALID_RESPONSE');let text=await response.text();if(text.length>37*1024*1024)throw Error('SERPRO_INVALID_RESPONSE');try{return JSON.parse(text);}catch{throw Error('SERPRO_INVALID_RESPONSE');}};
 const token=await request('https://gateway.apiserpro.serpro.gov.br/token',{method:'POST',headers:{Authorization:'Basic '+btoa(config.consumerKey+':'+config.consumerSecret),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});
 if(typeof token.access_token!=='string'||!token.access_token||token.access_token.length>8192)throw Error('SERPRO_CREDENTIALS_REJECTED');
 let key;for(let attempt=0;attempt<3;attempt++){
  const input={TipoContribuinte:1,ContribuinteConsulta:profile.cnpj,CodigoIdentificacao:'9001',GerarCertidaoPdf:true,...(key?{Chave:key}:{})};
  const body=await request(endpoint,{method:'POST',headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(input)});
  const result=decodeOfficialCertificate(body,profile.cnpj);
  if(result.outcome!=='processing')return result;
  if(!result.key||result.key.length>500)throw Error('SERPRO_INVALID_RESPONSE');key=result.key;if(attempt<2)await sleep(600);
 }
 return {outcome:'uncertain',reason:'A consulta continua em processamento. Confira o portal antes de autorizar nova operação cobrada.'};
}
export function safeConnectorError(error){return ({SERPRO_CONFIGURATION_REQUIRED:'Contrato, autorização ou segredos do Serpro ainda não configurados para esta empresa.',SERPRO_AUTHORIZATION_REQUIRED:'Autorize expressamente o consumo e eventual emissão cobrada.',SERPRO_TAXPAYER_MISMATCH:'O titular retornado difere do cadastro confirmado. Conferência humana obrigatória, inclusive matriz/filial.',SERPRO_PDF_REQUIRED:'A fonte não retornou um PDF oficial completo. Nenhuma renovação foi registrada.',SERPRO_NETWORK_UNCERTAIN:'Falha de comunicação; o resultado pode ser incerto. Confira no órgão antes de repetir.',SERPRO_RATE_LIMIT:'Limite do provedor. Uma nova tentativa exige aguardar o prazo indicado.',SERPRO_CREDENTIALS_REJECTED:'Credenciais ou contrato recusados pelo provedor.',SERPRO_UNAVAILABLE:'Serviço oficial indisponível.',SERPRO_INVALID_CERTIFICATE:'Código, titular ou datas oficiais inconsistentes.',SERPRO_INVALID_RESPONSE:'A resposta não corresponde ao contrato oficial esperado.'})[error?.message]||'Operação não concluída. Nenhum documento anterior foi alterado.';}
