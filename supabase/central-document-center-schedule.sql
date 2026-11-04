-- ATIVAÇÃO SEPARADA. Executar somente após autorização, migração e testes.
-- UTC 09:05 = 06:05 America/Fortaleza. Não envia e-mail nem emite documentos.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('inova-central-expiry-daily','5 9 * * *','select public.central_daily_enqueue();');
select cron.schedule('inova-central-queue','*/5 * * * *','select public.central_process_queue();');
-- Verificar cron.job e cron.job_run_details; não confundir cadastro com execução real.
