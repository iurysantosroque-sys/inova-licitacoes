-- Autorização específica da etapa 2 recebida em 04/11/2026.
-- Os jobs não ativam contrato/credenciais nem consentimento de consumo Serpro.
select cron.schedule('inova-central-official-daily','15 9 * * *','select public.central_connector_daily();');
select cron.schedule('inova-central-official-dispatch','* * * * *','select private.central_dispatch_official_worker();');
