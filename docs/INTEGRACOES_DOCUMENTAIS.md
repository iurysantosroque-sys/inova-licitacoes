# Integrações documentais e limitações — pesquisa em fontes oficiais

Revisão técnica de fontes: 04/11/2026. A disponibilidade de um portal público não implica autorização para scraping nem existência de API pública.

| Fonte | Modo entregue | Operação e limite |
|---|---|---|
| RFB / PGFN | ASSISTIDO + adaptador Serpro preparado | Portal oficial disponível. A API comercial Consulta CND exige contratação, segredos, autorização de consumo/emissão e teste real; não está homologada para esta empresa. |
| FGTS / CRF — CAIXA | ASSISTIDO | Consulta e verificação pelo usuário no portal. Não contornar CAPTCHA, login ou acesso por certificado. |
| CNDT — TST | ASSISTIDO | Emitir e validar no portal do TST, depois importar e registrar conferência humana. |
| TCU | ASSISTIDO | Consultas no portal oficial; conferir abrangência e eventual apontamento. |
| Fazendas estaduais/municipais | MANUAL | Exigem jurisdição, portal correto e análise específica. Não há conector nacional universal. |
| Falência / recuperação judicial | MANUAL | Tribunal, competência e abrangência precisam ser conferidos para o edital. |
| Assinatura | NÃO CONFIGURADA | API autorizada/credenciais e teste de integração não disponibilizados. Nenhum certificado ou token é recebido pelo frontend. |

## Fontes consultadas

- RFB: [Emitir certidão de regularidade fiscal](https://www.gov.br/pt-br/servicos/emitir-certidao-de-regularidade-fiscal). O serviço distingue certidão negativa, positiva com efeitos de negativa e positiva. A Central não deduz regularidade a partir da data de validade.
- CAIXA: [Consulta Regularidade do Empregador](https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf) e [Manual de Regularidade do Empregador](https://www.caixa.gov.br/Downloads/fgts-manuais-e-cartilhas-operacionais/Manual_de_Regularidade_do_Empregador_v19.pdf). Convênios e condições de acesso precisam de autorização própria.
- TST: [Certidão Negativa de Débitos Trabalhistas](https://cndt-certidao.tst.jus.br/).
- TCU: [Certidões Administração Pública Federal](https://certidoes-apf.apps.tcu.gov.br/).
- ITI/GOV.BR: [Catálogo de Assinatura Digital Avançada](https://www.gov.br/conecta/catalogo/apis/assinatura-digital-avancada) e [manual de integração](https://manual-integracao-assinatura-eletronica.servicos.gov.br/pt-br/latest/index.html). A API não deve ser presumida disponível a uma aplicação privada apenas por constar do catálogo.
- RFB: [Manual do cálculo do dígito verificador do CNPJ](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf), utilizado na validação numérica/alfanumérica do cadastro.
- Legislação para conferência das minutas: [Lei 14.133/2021](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm) e [Constituição Federal](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm). O cadastro não confirma fatos trabalhistas ou empresariais.

## Contrato padronizado

Na etapa 2, o transporte de servidor está em `supabase/functions/document-center-official/serpro.js`; os conectores assistidos continuam independentes em `document-connectors/`. Consulte `CENTRAL_DOCUMENTOS_ETAPA2.md` para ativação. Nenhuma consulta de teste com CNPJ real foi realizada nesta implementação.

`officialConnector(id)` expõe `consultarSituacao`, `verificarEmissao`, `solicitarEmissao`, `baixarDocumento`, `validarAutenticidade` e `identificarIntervencao`.

Nos métodos assistidos, o retorno é orientação de **intervenção necessária** e URL da fonte; `official_result` é sempre `null`. A interface nunca trata isso como resultado oficial. A API Serpro usa autorização separada e exclusiva do servidor; o modo legado `AUTOMATICO_AUTORIZADO` permanece bloqueado no banco.

Para ativar um conector automático futuro: documentar autorização/contrato do órgão, termos e limites; implementar autenticação exclusivamente no servidor; testar emissão/validação com retorno real; guardar evidência sem segredos; mapear falhas e intervenção; rever permissões e obter autorização específica de ativação. CAPTCHA, login interativo e certificado não podem ser contornados. Uma tentativa falha não apaga nem invalida a certidão anterior.
