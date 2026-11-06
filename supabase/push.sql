-- 2Fit · aviso do fim do descanso
-- Rode em Supabase > SQL Editor > New query > Run (uma vez).
-- Guarda, por celular, a hora em que o aviso deve tocar. Se o cronômetro for trocado
-- ou pulado antes, a função vê que a hora mudou e não manda o aviso antigo.
create table if not exists public.twofit_push (
  endpoint   text primary key,          -- endereço de notificação do celular
  user_id    uuid not null,
  fire_at    bigint not null default 0, -- Date.now() em que o aviso deve tocar (0 = cancelado)
  updated_at timestamptz not null default now()
);
-- Sem políticas: só a função (com a chave de serviço, que fica no Supabase) lê e grava.
alter table public.twofit_push enable row level security;
