# Validação da etapa 2 — 46.1.0

Implementação e testes locais em 04/11/2026. Nenhum dado de teste foi gravado no Supabase, nenhuma consulta de CNPJ foi enviada a órgão/Serpro e nenhuma certidão oficial foi emitida.

## Resultado

- 44 testes Node aprovados: regressões da Central/INOVA Docs/autofill e novos testes de contratos, titular, datas/PDF, OAuth, respostas HTML, status não conclusivos, timeout, processamento limitado, cobrança autorizada, bloqueio em demonstração e limpeza conservadora.
- Duas suítes SQL aprovadas em PostgreSQL local descartável (PGlite 0.5.15 + pgcrypto), com rollback. Incluem isolamento, papéis, fonte incompatível, autorização revogada, integração desligada, mudança de cadastro, hash estável entre fusos, idempotência, claim/lease/replay, tarefa abandonada, confirmação humana, candidato sem promoção automática, v2 preservando v1/PDF anterior e dispatcher sem configuração protegida.
- Revisão independente de segurança: riscos de série/caminho, autorização após enqueue e cleanup incerto identificados e corrigidos; nenhuma pendência P1/P2 no fluxo revisado.
- Navegador desktop/celular: três cartões com estados honestos, datas ausentes sem valores inventados, histórico, links oficiais sem CNPJ em URL, nove ações assistidas e ação Serpro bloqueadas na demonstração. Navegação por seta de Automações para Histórico manteve foco. A 390 px, scrollWidth=clientWidth (375 px descontada a barra), sem transbordamento global.
- Identidade escura/dourada preservada; sete subabas superiores mantidas. Console sem erros/avisos durante a verificação do painel.
- Sintaxe dos módulos e da Edge validada por Node; build Vite verificado. Avisos existentes de scripts clássicos e tamanho de bundle não equivalem a falha de build.

## Limites

Não houve homologação com retorno real Serpro, convênio CAIXA, CAPTCHA TST, sessão Auth real no novo fluxo, upload remoto oficial nem teste pg_net/Vault. Claims duplicados foram exercitados sequencialmente no PostgreSQL local; concorrência de trabalhadores reais depende de ensaio no ambiente de implantação. Mocks HTTP/fixtures são exclusivamente testes e não resultados oficiais.

Contrato Serpro e consentimento de cobrança/emissão são autorizações distintas da implantação; publicar a interface não os ativa. Credenciais não são solicitadas em chat nem no formulário do aplicativo.

## Preservação

Baseline remoto consultado somente por SELECT: 37 editais, 7 versões, 1 cadastro confirmado e 0 integrações. Backup de código 46.0.0 em `tmp/backup-central-etapa2-antes`; isso não é backup do banco/Storage. Alterações de lógica restritas aos módulos da Central; `app.js` muda somente a referência versionada de inicialização. O lockfile e as dependências do aplicativo foram preservados.

## Ativação autorizada em 04/11/2026

- Usuário autorizou explicitamente migrar, implantar e publicar, incluindo agendamento interno; consumo comercial do Serpro permaneceu fora dessa autorização.
- Migrações `central_official_connectors` e `central_official_schedule` aplicadas. Contagens posteriores preservadas: 37 editais, 7 versões, 1 cadastro; 0 integrações e 0 APIs habilitadas. Nenhum usuário fictício permaneceu no banco.
- RLS ativo nas três novas tabelas. Revisão de advisories: RPCs SECURITY DEFINER intencionais com papéis/escopo testados; tabela privada de quota sem policy permanece inacessível; aviso pré-existente de proteção de senhas vazadas não alterado nesta tarefa.
- Edge Function `document-center-official` versão 1, JWT obrigatório. Requisição vazia sem autenticação retornou HTTP 401.
- Jobs internos ativos: diário 09:15 UTC e dispatcher a cada minuto. `cron.job_run_details` confirmou `succeeded` às 18:13 e 18:14 UTC para o dispatcher, sem configuração de integração nem consulta externa. Isso não comprova emissão/consulta oficial nem homologação do Serpro.
