import test from 'node:test';
import assert from 'node:assert/strict';
import {fillVariables,generateManual,equivalence,validateStatus,assertRevision,safeFilename,plainToHtml,CATEGORIES} from '../inova-docs-core.js';

test('variáveis ausentes e quantidade zero não viram fatos inventados',()=>{
 assert.equal(fillVariables('{{orgao.nome}} / {{item.quantidade}} / {{empresa.cnpj}}',{orgao:{nome:'Órgão Exemplo'},item:{quantidade:0}}),'Órgão Exemplo / 0 / [PREENCHER]');
});
test('ausência de ficha técnica nunca comprova equivalência',()=>{
 assert.deepEqual(equivalence(['Látex natural'])[0],{exigencia:'Látex natural',resultado:'não confirmado',evidencia:'Documento comprobatório pendente.'});
});
test('modelos manuais preservam fatos e não inventam base jurídica',()=>{
 const generated=generateManual({facts:'178 pares; preço unitário R$ 16,90; total R$ 3.008,20.',request:'Substituir o produto e pedir mais prazo.',requirements:'Látex natural\nCano longo'},{name:'Empresa Fictícia'},'Substituição por equivalente');
 assert.match(generated.text,/178 pares/);assert.match(generated.text,/\[PREENCHER\]/);assert.match(generated.text,/depende de autorização formal/);assert.equal(generated.analysis.equivalencia.every(e=>e.resultado==='não confirmado'),true);assert.doesNotMatch(generated.text,/art\.\s*\d/i);assert.match(generated.email.body,/Substituir/);
});
test('envio precisa de dados e download não altera status',()=>{
 assert.throws(()=>validateStatus('enviado',{}),/Informe canal/);
 assert.equal(validateStatus('enviado',{channel:'Portal',recipient:'Órgão Exemplo',sent_at:'2026-10-22T12:00'}),'enviado');
 const draft={status:'rascunho'};generateManual({facts:'Exemplo fictício'},{},'Pedido de prazo');assert.equal(draft.status,'rascunho');assert.throws(()=>validateStatus('download'),/inválida/);
});
test('controle otimista impede sobrescrita de outra revisão',()=>{assert.doesNotThrow(()=>assertRevision(2,2));assert.throws(()=>assertRevision(3,2),/Outro usuário/);});
test('HTML gerado escapa conteúdo e nomes de arquivos são seguros',()=>{assert.match(plainToHtml('<script>alert(1)</script>'),/&lt;script&gt;/);assert.equal(safeFilename('../Relatório <2026>.pdf'),'..-Relatorio--2026-.pdf');assert.equal(Object.keys(CATEGORIES).length,5);});
