import test from 'node:test';
import assert from 'node:assert/strict';
import {fillVariables,generateManual,equivalence,validateStatus,assertRevision,safeFilename,plainToHtml,CATEGORIES,BUILTIN_TEMPLATES,resolveTemplateType,templatePayload} from '../inova-docs-core.js';

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

test('catálogo contém 24 modelos específicos com IDs, categorias e tipos válidos',()=>{
 assert.ok(BUILTIN_TEMPLATES.length>=24);assert.equal(new Set(BUILTIN_TEMPLATES.map(t=>t.id)).size,BUILTIN_TEMPLATES.length);
 assert.deepEqual(Object.fromEntries(Object.keys(CATEGORIES).map(category=>[category,BUILTIN_TEMPLATES.filter(t=>t.category===category).length])),{disputa:5,habilitacao:5,fornecimento:7,empresariais:5,mensagens:2});
 assert.equal(new Set(BUILTIN_TEMPLATES.map(t=>t.body)).size,BUILTIN_TEMPLATES.length);
 for(const template of BUILTIN_TEMPLATES){assert.ok(CATEGORIES[template.category].includes(template.type),template.id);assert.equal(resolveTemplateType(template),template.type);assert.match(template.body,/\[PREENCHER\]/);}
 assert.equal(BUILTIN_TEMPLATES.find(t=>t.id==='base').type,'Requerimento administrativo');assert.ok(BUILTIN_TEMPLATES.some(t=>t.id==='equivalencia'));
});
test('todos os modelos geram texto sem inventar valores, leis ou declarações',()=>{
 for(const template of BUILTIN_TEMPLATES){const output=generateManual({}, {},template.type,template.body);assert.match(output.text,/\[PREENCHER\]/,template.id);assert.doesNotMatch(output.text,/\{\{|art(?:igo)?\.??\s*\d|Lei\s*(?:n[º°o.]*)?\s*\d|CA\s*\d|R\$\s*\d/i,template.id);assert.match(output.text,/FATOS DECLARADOS/);}
 for(const template of BUILTIN_TEMPLATES.filter(t=>t.category==='empresariais'))assert.doesNotMatch(template.body,/declaramos que (?:cumprimos|não possuímos|somos)|a empresa (?:cumpre|não possui impedimentos)/i);
 const equivalent=BUILTIN_TEMPLATES.find(t=>t.id==='equivalencia');assert.match(equivalent.body,/depende de autorização formal/);assert.match(equivalent.body,/não está presumida/);assert.match(equivalent.body,/não suspende automaticamente/);
 assert.match(BUILTIN_TEMPLATES.find(t=>t.id==='prorrogacao').body,/não suspende automaticamente/);
});
test('resolver preserva tipo de cópias, modelos por nome e fallback legado',()=>{
 for(const template of BUILTIN_TEMPLATES){assert.equal(resolveTemplateType({category:template.category,name:template.name+' (cópia) (cópia)'}),template.type,template.id);}
 assert.equal(resolveTemplateType({category:'fornecimento',name:'Prorrogação de entrega'}),'Prorrogação de entrega');
 assert.equal(resolveTemplateType({category:'mensagens',name:'Personalizado legado'}),CATEGORIES.mensagens[0]);
 assert.equal(resolveTemplateType({category:'fornecimento',name:'Nome livre',type:'Resposta a notificação'}),'Resposta a notificação');
 assert.equal(resolveTemplateType({category:'mensagens',name:'Nome livre',type:'Recurso administrativo'}),CATEGORIES.mensagens[0]);
});
test('persistência de modelos inclui somente colunas editáveis existentes',()=>{
 const builtin=BUILTIN_TEMPLATES.find(t=>t.id==='equivalencia'),source={...builtin,id:'modelo-copiado',favorite:true,created_by:'não enviar',created_at:'não enviar'};
 const payload=templatePayload(source,'empresa-teste');assert.deepEqual(Object.keys(payload),['id','company_id','name','category','body','favorite','archived']);assert.equal(payload.company_id,'empresa-teste');assert.equal(payload.favorite,true);assert.equal(payload.archived,false);assert.equal('type' in payload,false);assert.equal(source.type,builtin.type);
});
