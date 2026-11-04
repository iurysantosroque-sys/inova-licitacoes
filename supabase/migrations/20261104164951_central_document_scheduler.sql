-- Somente tarefas internas: não envia e-mail, assina ou emite certidões.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('inova-central-expiry-daily','5 9 * * *','select public.central_daily_enqueue();');
select cron.schedule('inova-central-queue','*/5 * * * *','select public.central_process_queue();');
