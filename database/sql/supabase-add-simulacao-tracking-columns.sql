-- Adiciona colunas de tracking na tabela de simulações
alter table if exists public.simulacoes
  add column if not exists utm_source text;

alter table if exists public.simulacoes
  add column if not exists utm_medium text;

alter table if exists public.simulacoes
  add column if not exists utm_campaign text;

alter table if exists public.simulacoes
  add column if not exists utm_term text;

alter table if exists public.simulacoes
  add column if not exists utm_content text;

alter table if exists public.simulacoes
  add column if not exists landing_page text;

alter table if exists public.simulacoes
  add column if not exists referrer text;

alter table if exists public.simulacoes
  add column if not exists time_on_site integer;
