-- 2Fit · avisos da disputa (função "social")
-- Rode em Supabase > SQL Editor > New query > Run. Pode rodar de novo sem problema.

-- 1) Inscrições de notificação de cada celular. Só a função (chave de serviço) lê e grava:
--    com a segurança ligada e sem nenhuma regra, o app não enxerga esta tabela.
create table if not exists public.twofit_subs (
  endpoint   text primary key,
  p256dh     text not null,
  auth       text not null,
  user_id    uuid not null,
  social     boolean not null default true,   -- false = não quer receber avisos da disputa
  updated_at timestamptz not null default now()
);
alter table public.twofit_subs enable row level security;

-- 2) Código que só o agendador do banco e a função conhecem (gerado aqui, ninguém precisa copiar)
create table if not exists public.twofit_cron (
  id    int primary key default 1 check (id = 1),
  token text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
);
alter table public.twofit_cron enable row level security;
insert into public.twofit_cron (id) values (1) on conflict do nothing;

-- 3) Resumo de domingo às 20h de Brasília (23h UTC)
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule(jobid) from cron.job where jobname = '2fit-resumo';
select cron.schedule('2fit-resumo', '0 23 * * 0', $$
  select net.http_post(
    url := 'https://jrqtaayphmtorkeuyhir.supabase.co/functions/v1/social',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron', (select token from public.twofit_cron where id = 1)),
    body := '{"kind":"resumo"}'::jsonb
  );
$$);
