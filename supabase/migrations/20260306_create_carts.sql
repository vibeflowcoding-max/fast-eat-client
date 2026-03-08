create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  restaurant_slug text not null,
  restaurant_name text not null,
  branch_name text,
  is_active boolean not null default true,
  item_count integer not null default 0 check (item_count >= 0),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  cart_items jsonb not null default '[]'::jsonb,
  checkout_draft jsonb not null default '{}'::jsonb,
  restaurant_snapshot jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  last_restored_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_carts_customer_branch_unique
  on public.carts(customer_id, branch_id);

create index if not exists idx_carts_customer_active
  on public.carts(customer_id, is_active, updated_at desc);

create index if not exists idx_carts_restaurant_active
  on public.carts(restaurant_id, is_active, updated_at desc);

alter table public.carts enable row level security;

drop policy if exists "Users can view own carts" on public.carts;
create policy "Users can view own carts"
  on public.carts
  for select
  using (
    exists (
      select 1
      from public.customers
      where customers.id = carts.customer_id
        and customers.auth_user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert own carts" on public.carts;
create policy "Users can insert own carts"
  on public.carts
  for insert
  with check (
    exists (
      select 1
      from public.customers
      where customers.id = carts.customer_id
        and customers.auth_user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own carts" on public.carts;
create policy "Users can update own carts"
  on public.carts
  for update
  using (
    exists (
      select 1
      from public.customers
      where customers.id = carts.customer_id
        and customers.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.customers
      where customers.id = carts.customer_id
        and customers.auth_user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete own carts" on public.carts;
create policy "Users can delete own carts"
  on public.carts
  for delete
  using (
    exists (
      select 1
      from public.customers
      where customers.id = carts.customer_id
        and customers.auth_user_id = auth.uid()
    )
  );

create or replace function public.set_carts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_carts_updated_at on public.carts;
create trigger trg_carts_updated_at
before update on public.carts
for each row
execute function public.set_carts_updated_at();