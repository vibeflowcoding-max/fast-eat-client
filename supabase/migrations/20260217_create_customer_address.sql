create table if not exists public.customer_address (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  url_address text not null,
  building_type text not null check (
    building_type in (
      'Apartment',
      'Residential Building',
      'Hotel',
      'Office Building',
      'Other'
    )
  ),
  unit_details text,
  delivery_notes text not null default 'Meet at door',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_customer_address_unique_customer
  on public.customer_address(customer_id);

create index if not exists idx_customer_address_customer_id
  on public.customer_address(customer_id);

alter table public.customer_address enable row level security;

drop policy if exists "Users can view own addresses" on public.customer_address;
create policy "Users can view own addresses"
  on public.customer_address
  for select
  using (auth.uid() = customer_id);

drop policy if exists "Users can insert own addresses" on public.customer_address;
create policy "Users can insert own addresses"
  on public.customer_address
  for insert
  with check (auth.uid() = customer_id);

drop policy if exists "Users can update own addresses" on public.customer_address;
create policy "Users can update own addresses"
  on public.customer_address
  for update
  using (auth.uid() = customer_id)
  with check (auth.uid() = customer_id);

create or replace function public.set_customer_address_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_customer_address_updated_at on public.customer_address;
create trigger trg_customer_address_updated_at
before update on public.customer_address
for each row
execute function public.set_customer_address_updated_at();
