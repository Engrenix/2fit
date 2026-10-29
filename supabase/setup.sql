-- 2Fit · tabela de sincronização
-- Rode este arquivo inteiro em Supabase > SQL Editor > New query > Run.

create table if not exists public.twofit_docs (
  id          text primary key,                 -- id da sessão (ex.: 2026-10-27_infA) ou 'config'
  kind        text not null check (kind in ('session','config')),
  data        jsonb not null,                   -- o objeto inteiro, igual ao salvo no celular
  updated_at  bigint not null default 0,        -- Date.now() do celular que fez a última mudança
  updated_by  uuid default auth.uid(),
  modified    timestamptz not null default now()
);

-- Nunca deixa uma versão mais antiga sobrescrever uma mais nova
create or replace function public.twofit_keep_newest()
returns trigger language plpgsql as $$
begin
  if new.updated_at < old.updated_at then
    return old;
  end if;
  new.updated_by := auth.uid();
  new.modified := now();
  return new;
end $$;

drop trigger if exists twofit_keep_newest on public.twofit_docs;
create trigger twofit_keep_newest
  before update on public.twofit_docs
  for each row execute function public.twofit_keep_newest();

-- Segurança: só quem tem login lê e grava. Desligue os cadastros novos no painel
-- (Authentication > Sign In / Providers > "Allow new users to sign up" desligado),
-- assim só as contas que você criar à mão existem.
alter table public.twofit_docs enable row level security;

drop policy if exists "2fit ler" on public.twofit_docs;
drop policy if exists "2fit inserir" on public.twofit_docs;
drop policy if exists "2fit atualizar" on public.twofit_docs;

create policy "2fit ler"       on public.twofit_docs for select to authenticated using (true);
create policy "2fit inserir"   on public.twofit_docs for insert to authenticated with check (true);
create policy "2fit atualizar" on public.twofit_docs for update to authenticated using (true) with check (true);
-- Sem política de delete: ninguém apaga histórico pelo app.
