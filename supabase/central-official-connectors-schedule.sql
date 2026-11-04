-- Ativar somente após autorização de migração/agendamento. Sem credenciais neste arquivo.
-- Verificações assistidas geram pendências internas, sem chamadas aos portais.
select cron.schedule('inova-central-official-daily','15 9 * * *','select public.central_connector_daily();');
select cron.schedule('inova-central-official-dispatch','* * * * *','select private.central_dispatch_official_worker();');
-- RFB automática exige: contrato/segredos, resposta real homologada, autorização diária
-- e invocação do worker document-center-official por agendador autenticado.
-- Não colocar service_role no texto de cron.job. Usar Supabase Vault + pg_net
-- em implantação revisada, ou agendador externo com segredo protegido.
-- O dispatcher usa os segredos Vault inova_central_official_worker_url (URL completa
-- da função neste projeto) e inova_central_official_worker_jwt (JWT service_role
-- legado válido). Não colar segredos neste arquivo. verify_jwt permanece true.
-- Sem configuração, tarefas ficam na fila e o painel mostra impedimento explícito.
