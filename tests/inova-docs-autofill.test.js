import test from 'node:test';
import assert from 'node:assert/strict';
import {pricingDocumentSource,applyDocumentAutofill,markAutofillEdit} from '../inova-docs-autofill.js';
import {generateManual,BUILTIN_TEMPLATES} from '../inova-docs-core.js';

function fixture(){return {
  company:{id:'company-a'},demo:false,
  licitacoes:[{id:'t1',numero:'8/2026',orgao:'Órgão Exemplo',processo:'Processo 10',objeto:'Fornecimento',raw:{company_id:'company-a'}},{id:'t2',numero:'9/2026',orgao:'Outro Órgão',raw:{company_id:'company-a'}}],
  itens:[{id:'i1',licitacao_id:'t1',numero:8,descricao:'Ripa de madeira',quantidade:960,unidade:'UND',valor_estimado:188},{id:'i2',licitacao_id:'t1',numero:9,descricao:'Luva',quantidade:178,unidade:'PAR'},{id:'i3',licitacao_id:'t2',numero:1,descricao:'Outro item',quantidade:20,unidade:'UN'}],
  pricingItemResults:{i1:18.8},pricingExcludedItems:{},
  // Not authoritative for the declared price, regardless of cost or package size.
  cotacoes:[{item_id:'i1',fornecedor_id:'f1',marca:'Marca A Modelo A',preco:7.9,quantidade_cotada:5000,fator_equivalencia:10},{item_id:'i1',fornecedor_id:'f2',marca:'Marca B Modelo B',preco:6.2}],
  pricingSelectedSuppliers:{i1:'f1'}
};}
const sourceFor=state=>pricingDocumentSource(state,'t1',item=>state.cotacoes.find(q=>q.item_id===item.id&&q.fornecedor_id===state.pricingSelectedSuppliers[item.id]));

test('preço declarado vem apenas de Valor ganho; não custo, alvo ou governo',()=>{
  const state=fixture(),source=sourceFor(state),item=source.items[0];
  assert.equal(item.unit_price.replace(/\s/g,' '),'R$ 18,80');
  assert.equal(item.quantity,'960 UND');assert.match(item.product,/Marca A Modelo A/);
  assert.doesNotMatch(item.unit_price,/188|7,90/);assert.equal(source.items[1].unit_price,'');
  assert.deepEqual(Object.keys(source),['tender','items']);assert.equal('raw' in source.tender,false);assert.equal('cotacoes' in source,false);
});
test('usa a cotação canônica escolhida, sem buscar modelo em outro fornecedor',()=>{
  const state=fixture();state.pricingSelectedSuppliers.i1='f2';
  assert.match(sourceFor(state).items[0].product,/Marca B Modelo B/);
  state.cotacoes[1].marca='';
  assert.equal(sourceFor(state).items[0].product,'Ripa de madeira');
});
test('zero é explícito e valores ausentes, inválidos ou negativos não são inventados',()=>{
  const state=fixture();state.pricingItemResults.i1=0;state.itens[0].quantidade=0;
  assert.match(sourceFor(state).items[0].unit_price,/0,00/);assert.equal(sourceFor(state).items[0].quantity,'0 UND');
  for(const value of [null,undefined,'',NaN,Infinity,-1,'18,80']){state.pricingItemResults.i1=value;assert.equal(sourceFor(state).items[0].unit_price,'');}
  state.pricingItemResults.i1=18.805001;assert.match(sourceFor(state).items[0].unit_price,/18,805001/);
});
test('escopo empresa/edital, exclusões e demo só projetam o estado autorizado',()=>{
  const state=fixture(),seen=[];
  state.pricingExcludedItems.t1=['i2'];
  const source=pricingDocumentSource(state,'t1',item=>{seen.push(item.id);return null;});
  assert.deepEqual(seen,['i1']);assert.equal(source.items.length,1);
  assert.equal(pricingDocumentSource(state,'missing',()=>assert.fail()),null);
  state.company.id='company-b';assert.equal(sourceFor(state),null);
  state.demo=true;assert.equal(sourceFor(state).tender.id,'t1');
});
test('troca item e edital limpa campos automáticos ausentes sem perder manuais',()=>{
  const source=sourceFor(fixture());
  let result=applyDocumentAutofill({date:'22/10/2026'},undefined,source,'i1','time-1');
  assert.equal(result.context.number,'8/2026');assert.equal(result.context.quantity,'960 UND');
  result.context.recipient='Responsável informado pelo usuário';
  result.context.contact='contato confirmado';result.context.substitute_product='Modelo novo';
  result=applyDocumentAutofill(result.context,result.metadata,source,'i2','time-2');
  assert.equal(result.context.quantity,'178 PAR');assert.equal(result.context.unit_price,'');assert.equal(result.context.product,'Luva');
  assert.equal(result.context.recipient,'Responsável informado pelo usuário');assert.deepEqual(result.retained,['recipient']);
  const other=pricingDocumentSource(fixture(),'t2',()=>null);
  result=applyDocumentAutofill(result.context,result.metadata,other,'','time-3');
  assert.equal(result.context.number,'9/2026');assert.equal(result.context.process,'');assert.equal(result.context.object,'');
  assert.equal(result.context.product,'');assert.equal(result.context.quantity,'');assert.equal(result.context.item_id,'');
  assert.equal(result.context.contact,'contato confirmado');assert.equal(result.context.substitute_product,'Modelo novo');
});
test('limpeza intencional e preço manual permanecem durante atualização explícita',()=>{
  const source=sourceFor(fixture());let result=applyDocumentAutofill({},undefined,source,'i1');
  result.context.product='';result.metadata=markAutofillEdit(result.metadata,'product');
  result.context.unit_price='R$ 19,00';result.metadata=markAutofillEdit(result.metadata,'unit_price');
  result=applyDocumentAutofill(result.context,result.metadata,source,'i2');
  assert.equal(result.context.product,'');assert.equal(result.context.unit_price,'R$ 19,00');
  assert.deepEqual(result.retained,['product','unit_price']);
});
test('contexto salvo é snapshot e atualizar não reescreve o documento gerado',()=>{
  const state=fixture(),initial=applyDocumentAutofill({},undefined,sourceFor(state),'i1');
  const content=JSON.parse(JSON.stringify({context:initial.context,autofill:initial.metadata,text:'Texto já revisado'}));
  state.pricingItemResults.i1=25;
  assert.match(content.context.unit_price,/18,80/);assert.equal(content.autofill.item_id,'i1');
  const refreshed=applyDocumentAutofill(content.context,content.autofill,sourceFor(state),'i1');
  assert.match(refreshed.context.unit_price,/25,00/);assert.equal(content.text,'Texto já revisado');
  const removed=applyDocumentAutofill(refreshed.context,refreshed.metadata,null);
  assert.equal(removed.context.number,'');assert.equal(removed.context.unit_price,'');
});
test('produto original nunca preenche produto novo proposto em substituição',()=>{
  const result=applyDocumentAutofill({},undefined,sourceFor(fixture()),'i1');
  assert.equal(result.context.substitute_product,undefined);
  const template=BUILTIN_TEMPLATES.find(t=>t.id==='substituicao');
  let generated=generateManual(result.context,{},template.type,template.body);
  assert.match(generated.text,/Produto originalmente ofertado: Ripa de madeira/);
  assert.match(generated.text,/Produto proposto: \[PREENCHER\]/);
  generated=generateManual({...result.context,substitute_product:'Produto novo informado'}, {},template.type,template.body);
  assert.match(generated.text,/Produto proposto: Produto novo informado/);
  const proposal=BUILTIN_TEMPLATES.find(t=>t.id==='proposta-formal');
  assert.match(generateManual(result.context,{},proposal.type,proposal.body).text,/Marca, modelo, unidade e quantidade: Ripa de madeira/);
});
