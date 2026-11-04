# Monitoramento independente — 46.1.1

## Correção

O status legado de integração misturava a configuração do Serpro com a preferência de verificação diária. A Central passa a calcular três eixos independentes: monitoramento interno, integração Serpro e emissão. `daily_checks=true` ativa o monitor gratuito, inclusive quando o transporte oficial está desligado. Nenhum contrato, credencial ou consentimento de cobrança é criado por essa preferência.

A nova RPC `central_configure_monitoring` altera somente a preferência diária e a próxima execução. Exige administrador e cadastro confirmado; preserva os campos de contrato, API, autorização comercial, homologação e histórico. Desativar limpa a próxima execução, sem apagar tentativas ou documentos. Salvar novamente uma preferência já ativa preserva sua próxima data.

`central_monitoring_health` é somente leitura e limitada à empresa autorizada. Retorna metadados dos dois jobs conhecidos, resultados internos por empresa e evidência de homologação. Não retorna comandos cron, segredos, CNPJ ou arquivos. A atualização do painel ocorre a cada 30 segundos em Automações/Histórico, com aba visível e sem formulário em edição.

Uma próxima data é apenas programação. A comprovação interna exige tarefa diária concluída e tentativa correspondente. O estado do agendador usa `cron.job_run_details`, distingue execução em andamento, falha, ausência de registro e atraso. A emissão automática depende também de consentimento diário, evidência oficial e transporte configurado. Uma data de homologação isolada não basta. Falhas do scanner propagam para o job; erros de transporte continuam sanitizados e preservam a fila.

## Verificação do servidor existente

Consulta somente leitura em 04/11/2026, cerca de 18:38 UTC: dispatcher ativo com 24 execuções concluídas, última às 18:36 UTC. Foram encontradas tarefas diárias concluídas com tentativas de intervenção para RFB (18:32 UTC), FGTS (18:35 UTC) e CNDT (18:36 UTC), além da próxima execução programada. As três preferências diárias estavam ativas. Isso comprova monitoramento interno real, sem afirmar consulta ou emissão oficial. O job das 09:15 UTC ainda não tinha sua primeira execução; o dispatcher por minuto também chama o scanner.

Não havia autorização/API comercial habilitada, referência de contrato, retorno oficial, PDF recebido ou promoção de certidão. `pg_net` não estava instalado. Nenhuma configuração externa ou dado do servidor foi alterado na investigação. Credenciais e valores do Vault não foram consultados.

## Validação local

- 54 testes Node aprovados, incluindo persistência seguida de releitura, três eixos, ausência de contrato, comprovação por tarefa/tentativa, fila independente do monitor e proteção de formulários durante atualização.
- Três suítes SQL aprovadas em PostgreSQL local descartável, com rollback: permissões, isolamento, configuração gratuita preservando autorizações, execução real da rotina SQL, resultado persistido, reagendamento, idempotência, logs cron e propagação de falhas.
- Build Vite e sintaxe dos módulos aprovados; avisos preexistentes de scripts clássicos e tamanho de bundle mantidos.
- Navegador em demonstração: painel e formulários gratuitos/comerciais separados, controles oficiais bloqueados, desktop e 390 px sem transbordamento global, console sem erros. Nenhum dado fictício enviado ao servidor ou a órgão.

Migração aditiva: `20261104184207_central_monitoring_status.sql`. A migração substitui rotinas e acrescenta RPCs/índice; não apaga registros nem altera configurações comerciais existentes. Não houve teste de emissão Serpro nem ativação paga.

Backup de código anterior: `tmp/backup-central-status-461`. Não é backup do banco ou do Storage. Alterações de aplicação limitadas aos módulos da Central, referências de carregamento/cache e versão; demais módulos e dados preservados.

## Implantação autorizada em 04/11/2026

Usuário autorizou explicitamente migrar e publicar 46.1.1. Migração aplicada às 19:01:46 UTC (histórico remoto `20261104190146`, nome `central_monitoring_status`). Dispatcher registrou nova execução `succeeded` às 19:02 UTC após a migração. Preservados 37 editais, sete versões documentais, um cadastro e zero candidatos oficiais; as três preferências diárias e respectivas próximas datas foram mantidas. Todas as APIs, autorizações de consumo diário e de cobrança continuaram desativadas.

As duas novas RPCs negam execução anônima, têm `search_path` fixo e controle de empresa/papel testado localmente. Advisors sinalizam as RPCs SECURITY DEFINER intencionais; a tabela privada de quota sem policy e o aviso de senhas vazadas desabilitado já existiam. Não houve ampliação de acesso a documentos ou segredos. O fluxo com sessão Auth real de usuário não foi exercitado pelo agente; não houve personificação de usuário nem emissão oficial no ensaio de implantação.
