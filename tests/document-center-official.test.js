import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSerproConfig,decodeOfficialCertificate,requestSerproCertificate,safeConnectorError} from '../supabase/functions/document-center-official/serpro.js';
import {fgtsRenewalAllowed} from '../document-connectors/fgts-crf.js';
import {connectorPanel} from '../document-center-official-ui.js';
import {createDocumentService} from '../document-center-service.js';
import {cleanupConfirmedOrphan} from '../supabase/functions/document-center-official/cleanup.js';
const company='f2000000-0000-4000-8000-000000000001',cnpj='11222333000181';
const profile={company_id:company,cnpj,confirmed_at:'2026-11-04T12:00:00Z'};
const config={companyId:company,consumerKey:'test-only-key',consumerSecret:'test-only-secret',authorizationReference:'Contrato fictício somente no teste',allowBillableIssuance:true,endpoint:'https://gateway.apiserpro.serpro.gov.br/consulta-cnd/v1/certidao'};
const fixturePdf=btoa('%PDF-1.4\nDOCUMENTO FICTICIO APENAS TESTE\n%%EOF');
const certificate=(Status=1)=>({Status,Certidao:{TipoContribuinte:1,ContribuinteCertidao:cnpj,TipoCertidao:1,CodigoControle:'FICTICIO-TESTE',DataEmissao:'2026-11-04T12:00:00',DataValidade:'2027-05-03',DocumentoPdf:fixturePdf}});
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
test('Serpro bloqueia configuração ausente, empresa diversa, endpoints arbitrários e trial antes da rede',async()=>{
 for(const patch of [{companyId:'outra'},{consumerSecret:''},{allowBillableIssuance:false},{endpoint:'https://example.invalid/certidao'},{endpoint:'https://gateway.apiserpro.serpro.gov.br/consulta-cnd-trial/v1/certidao'},{endpoint:'https://gateway.apiserpro.serpro.gov.br/consulta-cnd/v1/certidao?token=x'}])assert.throws(()=>validateSerproConfig({...config,...patch},company),/CONFIGURATION/);
 let calls=0;await assert.rejects(requestSerproCertificate({config,companyId:company,profile,authorizeBillableIssuance:false,fetchImpl:()=>{calls++;}}),/AUTHORIZATION/);assert.equal(calls,0);
});
test('cadastro confirmado é obrigatório e titular devolvido precisa corresponder exatamente',async()=>{
 let calls=0;await assert.rejects(requestSerproCertificate({config,companyId:company,profile:{...profile,confirmed_at:null},authorizeBillableIssuance:true,fetchImpl:async()=>{calls++;throw Error('Nenhuma rede permitida neste teste');}}),/AUTHORIZATION/);assert.equal(calls,0);
 assert.throws(()=>decodeOfficialCertificate({...certificate(),Certidao:{...certificate().Certidao,ContribuinteCertidao:'99999999000100'}},cnpj),/TAXPAYER_MISMATCH/);
});
test('HTTP 200 não comprova emissão: status 3/4 não emitida; 5/6 transitórios',()=>{
 for(const Status of [3,4])assert.equal(decodeOfficialCertificate({Status},cnpj).outcome,'not_issued');
 for(const Status of [5,6])assert.equal(decodeOfficialCertificate({Status},cnpj).outcome,'retry');
 assert.throws(()=>decodeOfficialCertificate({Status:99},cnpj),/INVALID_RESPONSE/);
});
test('PDF, código e datas são obrigatórios; HTML e PDF truncado não são certidão oficial',()=>{
 for(const patch of [{DocumentoPdf:''},{DocumentoPdf:btoa('<html>CAPTCHA</html>')},{DocumentoPdf:btoa('%PDF-1.4 sem fim')},{CodigoControle:''},{DataValidade:'2026-02-30'}])assert.throws(()=>decodeOfficialCertificate({...certificate(),Certidao:{...certificate().Certidao,...patch}},cnpj));
 assert.equal(decodeOfficialCertificate(certificate(1),cnpj).outcome,'official_found');assert.equal(decodeOfficialCertificate(certificate(2),cnpj).outcome,'official_issued');
});
test('OAuth e consulta usam contrato documentado, sem CNPJ alternativo e sem seguir redirecionamentos',async()=>{
 const calls=[];const result=await requestSerproCertificate({config,companyId:company,profile,authorizeBillableIssuance:true,fetchImpl:async(url,options)=>{calls.push({url,options});return calls.length===1?json({access_token:'test-token'}):json(certificate());}});
 assert.equal(result.outcome,'official_found');assert.equal(calls[0].url,'https://gateway.apiserpro.serpro.gov.br/token');assert.equal(calls[0].options.body,'grant_type=client_credentials');
 assert.deepEqual(JSON.parse(calls[1].options.body),{TipoContribuinte:1,ContribuinteConsulta:cnpj,CodigoIdentificacao:'9001',GerarCertidaoPdf:true});assert.ok(calls.every(c=>c.options.redirect==='error'));
});
test('status 7 usa chave só no encadeamento temporário e espera pelo menos 500ms',async()=>{
 let call=0;const calls=[],waits=[];const result=await requestSerproCertificate({config,companyId:company,profile,authorizeBillableIssuance:true,sleep:async ms=>waits.push(ms),fetchImpl:async(url,options)=>{calls.push(options);call++;return call===1?json({access_token:'test-token'}):call===2?json({Status:7,Chave:'chave-apenas-memoria'},201):json(certificate(2));}});
 assert.equal(JSON.parse(calls[2].body).Chave,'chave-apenas-memoria');assert.ok(waits[0]>=500);assert.equal(result.outcome,'official_issued');assert.ok(!('key' in result));
});
test('processamento infinito é limitado e falha de rede não vira renovação',async()=>{
 let calls=0;const result=await requestSerproCertificate({config,companyId:company,profile,authorizeBillableIssuance:true,sleep:async()=>{},fetchImpl:async()=>++calls===1?json({access_token:'test-token'}):json({Status:7,Chave:'pendente'},201)});assert.equal(calls,4);assert.equal(result.outcome,'uncertain');
 await assert.rejects(requestSerproCertificate({config,companyId:company,profile,authorizeBillableIssuance:true,fetchImpl:async()=>{throw Error('private secret');}}),/NETWORK_UNCERTAIN/);assert.ok(!safeConnectorError(Error('private secret')).includes('private secret'));
});
test('respostas HTML e limitação de API são erros seguros',async()=>{
 await assert.rejects(requestSerproCertificate({config,companyId:company,profile,authorizeBillableIssuance:true,fetchImpl:async()=>new Response('<html>login</html>',{headers:{'Content-Type':'text/html'}})}),/INVALID_RESPONSE/);
 await assert.rejects(requestSerproCertificate({config,companyId:company,profile,authorizeBillableIssuance:true,fetchImpl:async()=>json({},429)}),/RATE_LIMIT/);
});
test('FGTS respeita janela usual de cinco dias e ausência de data exige intervenção',()=>{
 assert.equal(fgtsRenewalAllowed('2026-11-10','2026-11-04'),false);assert.equal(fgtsRenewalAllowed('2026-11-09','2026-11-04'),true);assert.equal(fgtsRenewalAllowed(null,'2026-11-04'),false);
});
test('painel não inventa última consulta nem próxima data; demo desabilita operações oficiais',()=>{
 const data={profile:null,integrations:[],connectorTasks:[],connectorAttempts:[],validations:[],artifacts:[]};const html=connectorPanel(data,{demo:true,canWrite:true,canReview:true,isAdmin:true});assert.match(html,/Nenhum CNPJ fictício será enviado/);assert.match(html,/Sem retorno real homologado/);assert.match(html,/Agendamento não ativado/);assert.match(html,/data-dc-action="official-consult" disabled/);
});
test('serviço nunca aciona conector real a partir da demonstração',async()=>{
 let calls=0;const service=createDocumentService({rpc:()=>calls++},()=>({demo:true,company:{id:company}}));await assert.rejects(service.requestOfficial('rfb','consultar','serpro',true),/demonstração/);assert.equal(calls,0);
});
test('limpeza preserva candidato vinculado e qualquer resultado de leitura incerto',async()=>{
 let removedAfterThrow=0;await cleanupConfirmedOrphan({from(){throw Error('rede indisponível');},storage:{from(){return {async remove(){removedAfterThrow++;}};}}},'new/path.pdf');assert.equal(removedAfterThrow,0);
 for(const responses of [[{data:[],error:Error('falha')},{data:[],error:null}],[{data:[{id:'vinculado'}],error:null},{data:[],error:null}],[{data:[],error:null},{data:[{id:'versão'}],error:null}],[{data:undefined,error:null},{data:[],error:null}]]){
  let i=0,removed=0;const admin={from(){return {select(){return this;},eq(){return this;},async limit(){return responses[i++];}};},storage:{from(){return {async remove(){removed++;}};}}};await cleanupConfirmedOrphan(admin,'new/path.pdf');assert.equal(removed,0);
 }
 let removed=[];const admin={from(){return {select(){return this;},eq(){return this;},async limit(){return {data:[],error:null};}};},storage:{from(){return {async remove(paths){removed=paths;}};}}};await cleanupConfirmedOrphan(admin,'new/path.pdf');assert.deepEqual(removed,['new/path.pdf']);
});
