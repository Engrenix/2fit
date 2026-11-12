-- 2Fit · aviso do fim do descanso
-- Rode em Supabase > SQL Editor > New query > Run. Pode rodar de novo sem problema.
-- Guarda, por celular, a hora em que o aviso deve tocar. Se o cronômetro for trocado
-- ou pulado antes, a função vê que a hora mudou e não manda o aviso antigo.
create table if not exists public.twofit_push (
  endpoint   text primary key,          -- endereço de notificação do celular
  user_id    uuid not null default auth.uid(),
  fire_at    bigint not null default 0, -- Date.now() em que o aviso deve tocar (0 = cancelado)
  updated_at timestamptz not null default now()
);
alter table public.twofit_push enable row level security;

-- Cada pessoa só mexe nas linhas do próprio celular
drop policy if exists "2fit push ler" on public.twofit_push;
drop policy if exists "2fit push inserir" on public.twofit_push;
drop policy if exists "2fit push atualizar" on public.twofit_push;
create policy "2fit push ler"       on public.twofit_push for select to authenticated using (user_id = auth.uid());
create policy "2fit push inserir"   on public.twofit_push for insert to authenticated with check (user_id = auth.uid());
create policy "2fit push atualizar" on public.twofit_push for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
