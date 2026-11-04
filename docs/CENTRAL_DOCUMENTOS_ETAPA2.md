# Central de Documentos — etapa 2 (46.1.0)

## Entrega e situação real

Implementação incremental, restrita à Central. Cadastro confirmado (`central_company_profiles`) é a fonte única do CNPJ. O cliente envia somente empresa/tarefa/operação: a Edge rejeita CNPJ alternativo e o lê do banco. Não há dados fictícios nos fluxos oficiais. Demonstração bloqueia operações e configuração; fixtures existem somente nos testes locais.

| Órgão | Disponível no código | Dependência real |
|---|---|---|
| Receita/PGFN | Consulta, emissão e validação assistidas; adaptador OAuth2 Consulta CND do Serpro no servidor; recebimento de PDF candidato | Contrato comercial, endpoint confirmado no contrato, Consumer Key/Secret, autorização de consumo/emissão e homologação com retorno real. Não está anunciado como operacional. |
| CAIXA FGTS/CRF | Pendência assistida, links oficiais, conferência humana, importação/renovação privada existente | CAPTCHA/login quando apresentados; para automação em lote, convênio e documentação técnica efetivos da CAIXA. Nenhuma API pública livre foi presumida. |
| TST CNDT | Emissão e validação assistidas, links distintos, conferência humana, importação privada existente | Emissão apresenta desafio visual. Nenhuma API automática autorizada foi confirmada. |

Uma abertura de portal é uma tentativa/intervenção, nunca uma consulta oficial bem-sucedida. O painel separa última tentativa, resposta oficial recebida, conferência humana, próxima verificação persistida e homologação. Resultados, erros sanitizados e responsáveis ficam no histórico e na auditoria.

## Fontes primárias verificadas em 04/11/2026

- Serpro: [serviço e contratação para PJ](https://www.gov.br/pt-br/servicos/obter-solucao-de-consulta-de-dados-de-certidao-negativa-de-debito-cnd), [introdução](https://apicenter.estaleiro.serpro.gov.br/documentacao/consulta-cnd/pt/introducao/), [autenticação](https://apicenter.estaleiro.serpro.gov.br/documentacao/consulta-cnd/pt/global/quick_start/), [requisição](https://apicenter.estaleiro.serpro.gov.br/documentacao/consulta-cnd/pt/global/servicos_api_macro/), [retornos](https://apicenter.estaleiro.serpro.gov.br/documentacao/consulta-cnd/pt/tipos_retornados/).
- CAIXA: [consulta pública](https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf) e [Manual de Regularidade do Empregador V19](https://www.caixa.gov.br/Downloads/fgts-manuais-e-cartilhas-operacionais/Manual_de_Regularidade_do_Empregador_v19.pdf), itens 2.2 e 2.7 (convênio/consulta, autenticidade e janela usual de renovação).
- TST: [emitir CNDT](https://cndt-certidao.tst.jus.br/gerarCertidao) e [validar CNDT](https://cndt-certidao.tst.jus.br/consultarCertidao).
- Supabase: [agendamento de funções](https://supabase.com/docs/guides/functions/schedule-functions), [pg_net](https://supabase.com/docs/guides/database/extensions/pg_net), [Vault](https://supabase.com/docs/guides/database/vault).

Consulta CND pode emitir nova certidão quando não encontra uma válida e pode gerar cobrança. HTTP 200 não significa emissão: status 1 indica encontrada, 2 emitida e 3/4 não emitida; 5/6 são transitórios e 7 indica processamento. A chave de processamento permanece apenas em memória; há no máximo três chamadas encadeadas e espera de 600 ms. Não se persiste a chave nem o token. Timeout com resultado incerto não dispara nova emissão cegamente.

## Migração e instalação

1. Revisar a migração aditiva `supabase/migrations/20261104172113_central_official_connectors.sql` e executar as suítes locais. Fazer backup operacional do banco e Storage conforme política existente; backup de código não substitui os bytes dos PDFs.
2. Após autorização da implantação, aplicar somente essa migração no banco que já tem a primeira etapa. Ela acrescenta campos de integração e tabelas de tarefas/tentativas/candidatos; não remove versões, arquivos, editais, itens ou fornecedores. Também liga a fonte de conferência ao tipo da versão, corrigindo conferências de fonte incompatível.
3. Implantar `document-center-official` com `index.ts`, `serpro.js` e `cleanup.js`, JWT obrigatório. O cliente usa autenticação do usuário; o worker interno aceita apenas o JWT de serviço mantido no servidor.
4. Publicar os módulos, pasta `document-connectors`, CSS, índice e service worker versionados juntos. Nenhuma outra lógica do aplicativo foi alterada.
5. Ativar os jobs pela migração versionada `supabase/migrations/20261104181220_central_official_schedule.sql`, após revisão/autorização. O script `supabase/central-official-connectors-schedule.sql` é a referência operacional equivalente. Jobs cadastrados não provam execução: conferir `cron.job_run_details`, fila e tentativas.

## Configuração RFB/Serpro

O administrador confirma o cadastro real e registra a referência do contrato em Automações. A autorização de API exige confirmação expressa de consumo cobrado e eventual emissão. Cada operação manual pede confirmação novamente; o consumo diário tem autorização separada e só passa a ser enfileirado após um retorno oficial real com PDF válido.

Definir os segredos no ambiente da Edge, nunca em arquivos públicos, URLs ou formulários do app:

- `SERPRO_CND_COMPANY_ID`: ID estável da única empresa autorizada para esse contrato.
- `SERPRO_CND_CONSUMER_KEY` e `SERPRO_CND_CONSUMER_SECRET`: fornecidos pelo contrato Serpro.
- `SERPRO_CND_ENDPOINT`: URL de produção copiada da referência oficial/contrato; não há endpoint presumido. O adaptador exige HTTPS no gateway oficial, caminho Consulta CND, sem query, credenciais embutidas, redirect, trial ou demonstração.
- `SERPRO_CND_AUTHORIZATION_REFERENCE`: deve corresponder exatamente à referência autorizada no banco.
- `SERPRO_CND_ALLOW_BILLABLE_ISSUANCE=true`: ativação explícita pelo operador após autorização comercial. O padrão é bloqueado.

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` vêm do ambiente protegido do Supabase. Nenhum segredo é enviado ao navegador. A implementação atual do worker usa o JWT legado de serviço; uma chave `sb_secret_...` não é um JWT e não deve ser usada como Bearer nessa configuração.

Configurar credenciais não equivale a homologar. O primeiro ensaio autorizado deve ser feito com cadastro real, orçamento/contrato aceitos e revisão do retorno. Como esse ensaio não foi realizado, não há afirmação de API oficial operacional nesta entrega.

## Agendamento persistente

`central_connector_daily()` observa `next_check_at` e configurações por empresa. Para FGTS/CNDT e RFB assistida, cria pendência interna sem acessar o órgão. Solicitações repetidas na janela são deduplicadas. O CRF tem janela usual de renovação nos cinco dias anteriores ao vencimento; exceções devem ser conferidas na CAIXA. Datas sempre vêm do documento real, sem recalcular prazo por suposição.

A fila usa uma tarefa ativa por empresa/fonte, lease, claim único, três tentativas e backoff limitado. Antes da rede, revalida cadastro, integração, solicitante, administrador autorizador e consentimento diário. Lease expirado vira resultado incerto, não renovação automática.

O dispatcher privado está implementado. Para usá-lo, o operador precisa habilitar `pg_net` e Vault no projeto e cadastrar em Vault, fora do frontend:

- `inova_central_official_worker_url`: URL completa de `document-center-official` neste projeto.
- `inova_central_official_worker_jwt`: JWT de serviço válido deste mesmo projeto.

Sem essa configuração, mantém tarefas na fila e informa o impedimento. O job contém só a chamada da função privada, sem token. O `pg_net` mantém cabeçalhos temporariamente na fila interna: apenas administradores confiáveis devem ter acesso SQL; nunca expor `net` ou `vault` pela Data API. Pode-se usar agendador externo autorizado com segredo protegido em vez de Vault/pg_net. Nenhuma dessas configurações foi ativada automaticamente nesta implementação.

## PDF e renovação

O servidor verifica resposta, titular exato, código, datas, tipo e estrutura PDF antes de salvar candidato privado com SHA-256 e série UUID. Se a fonte retornar matriz diferente da filial cadastrada, exige intervenção em vez de promover automaticamente. Resposta HTML/login/CAPTCHA, PDF ausente/truncado e dados inconsistentes não viram documento.

O revisor baixa o candidato autenticado, confere titular/tipo/código/datas e confirma expressamente a criação da versão. Só então a RPC cria a nova versão na série correta e atualiza a referência do candidato. A versão anterior e seu arquivo permanecem. Confirmações repetidas são idempotentes; conflito de versão ou cadastro alterado bloqueia a promoção. Certidão encontrada não é exibida como recém-renovada. Conferência humana não é apresentada como autenticação automática de documento antigo.

Se a gravação tiver resultado incerto, o arquivo é retido. A limpeza remove somente upload novo comprovadamente órfão após consultas bem-sucedidas tanto em candidatos quanto em versões.

## Testes reproduzíveis e limites

```
node --test tests/document-center-core.test.js tests/document-center-service.test.js tests/document-center-official.test.js tests/inova-docs-core.test.js tests/inova-docs-autofill.test.js
```

Para PostgreSQL local descartável, instalar a dependência de teste isoladamente, sem scripts:

```
npm install --prefix tmp/central-stage2-runtime --workspaces=false --ignore-scripts @electric-sql/pglite@0.5.15
node tests/run-central-official-sql.mjs
```

O harness usa PostgreSQL/PGlite com pgcrypto, papéis, RLS e transações revertidas. Não acessa o Supabase. O bootstrap reduzido está em `tests/helpers`; não substitui homologação do gateway Auth, Storage HTTP, pg_net/Vault ou trabalhadores paralelos em ambiente real.

Foram verificados 44 testes Node, duas suítes SQL e a interface em desktop/celular/teclado. HTTP oficial é simulado exclusivamente dentro dos testes, com fixtures identificadas como fictícias; esses resultados nunca aparecem como certidões reais. Não foi executada consulta cobrada com CNPJ real, emissão oficial, CAPTCHA ou autenticação em órgão. Consulte `CENTRAL_DOCUMENTOS_ETAPA2_QA.md` para a evidência da validação.
