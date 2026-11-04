import test from 'node:test';
import assert from 'node:assert/strict';
import {createDocumentService} from '../document-center-service.js';

const company='a2000000-0000-4000-8000-000000000001';
const current=()=>({demo:false,company:{id:company},user:{id:'qa-user'}});

test('carregamento compartilhado usa colunas existentes e filtro empresarial em cada tabela',async()=>{
 const calls=[];
 const db={from(table){const call={table,orders:[]};calls.push(call);return {select(){return this;},eq(key,value){call.filter=[key,value];return this;},order(key){call.orders.push(key);return this;},async range(){return {data:[],error:null};},async maybeSingle(){return {data:null,error:null};}};}};
 const service=createDocumentService(db,current),data=await service.load();
 assert.equal(data.profile,null);assert.ok(calls.length>=15);
 for(const call of calls)assert.deepEqual(call.filter,['company_id',company]);
 assert.deepEqual(calls.find(c=>c.table==='central_validations').orders,['checked_at','id']);
 assert.deepEqual(calls.find(c=>c.table==='central_reviews').orders,['approved_at','id']);
 assert.deepEqual(calls.find(c=>c.table==='central_permissions').orders,['created_at','user_id']);
});

test('falha no registro de renovação limpa somente o upload órfão novo',async()=>{
 const uploaded=[],removed=[],previous={id:'old-version',document_series_id:'qa-series',version:1,storage_path:'old-path',expires_on:'2026-11-19'};
 const storage={async upload(path,file,options){uploaded.push({path,options});return {data:{},error:null};},async remove(paths){removed.push(...paths);return {data:{},error:null};}};
 const db={storage:{from(bucket){assert.equal(bucket,'qualification-files');return storage;}},async rpc(){return {data:null,error:{message:'Conflito de versão'}};}};
 const service=createDocumentService(db,current),file=new File(['%PDF-1.4\nfixture'], 'qa.pdf',{type:'application/pdf'});
 await assert.rejects(service.upload(file,{name:'Teste',issuer:'Teste',issued_on:'2026-11-04',expires_on:'2026-11-19',confirmed:true},previous),/Conflito/);
 assert.equal(uploaded.length,1);assert.equal(uploaded[0].options.upsert,false);
 assert.deepEqual(removed,[uploaded[0].path]);assert.notEqual(removed[0],previous.storage_path);
 assert.equal(previous.version,1);assert.equal(previous.expires_on,'2026-11-19');
});

test('download rejeita empresa errada antes da rede e divergência de hash',async()=>{
 let downloads=0;const db={storage:{from(){return {async download(){downloads++;return {data:new Blob(['arquivo alterado']),error:null};}};}}};
 const service=createDocumentService(db,current);
 await assert.rejects(service.download({company_id:'outra',storage_path:'privado'}),/outra empresa/);
 assert.equal(downloads,0);
 await assert.rejects(service.download({company_id:company,storage_path:'privado',sha256:'0'.repeat(64)}),/hash/);
 assert.equal(downloads,1);
});

test('aprovação mantém revisão e hash após recarga e edição volta a rascunho',async()=>{
 const values=new Map();globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 const demo=()=>({...current(),demo:true});
 let service=createDocumentService(null,demo);
 const saved=await service.rpc('central_save_declaration',{p_id:'qa-declaration',p_expected_revision:0,p_data:{title:'Teste fictício',text:'Somente um teste de revisão.'}});
 await service.rpc('central_approve_declaration',{p_id:saved.id,p_revision:saved.revision,p_sha256:saved.sha256,p_confirmed:true,p_responsible_name:'Responsável fictício'});
 service=createDocumentService(null,demo);
 let data=await service.load();
 assert.equal(data.declarations[0].state,'approved');
 assert.equal(data.reviews[0].sha256,data.declarations[0].sha256);
 assert.equal(data.reviews[0].revision,data.declarations[0].revision);
 await service.rpc('central_save_declaration',{p_id:saved.id,p_expected_revision:1,p_data:{title:'Teste fictício',text:'Texto alterado em teste.'}});
 data=await service.load();assert.equal(data.declarations[0].state,'draft');assert.equal(data.declarations[0].revision,2);
 assert.equal(data.declarationVersions.length,2);assert.equal(data.reviews[0].revision,1);
});
