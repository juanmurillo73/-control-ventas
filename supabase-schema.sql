-- ============================================================
-- Esquema de base de datos: Control de Ventas
-- Pega TODO este archivo en Supabase -> SQL Editor -> Run
-- ============================================================

-- Tabla de metas mensuales (una fila por usuario por mes)
create table if not exists metas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mes text not null, -- formato 'YYYY-MM'
  meta numeric not null default 0,
  cotizaciones integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, mes)
);

-- Tabla de ventas individuales
create table if not exists ventas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mes text not null, -- formato 'YYYY-MM', a qué mes pertenece
  nombre text not null,
  acv numeric not null default 0,
  origen text,
  probabilidad text,
  fecha date,
  seguimiento text,
  factura text,
  notas text,
  created_at timestamptz not null default now()
);

-- Seguridad a nivel de fila: cada quien solo ve y edita SUS propios datos
alter table metas enable row level security;
alter table ventas enable row level security;

create policy "metas: select propio" on metas
  for select using (auth.uid() = user_id);
create policy "metas: insert propio" on metas
  for insert with check (auth.uid() = user_id);
create policy "metas: update propio" on metas
  for update using (auth.uid() = user_id);
create policy "metas: delete propio" on metas
  for delete using (auth.uid() = user_id);

create policy "ventas: select propio" on ventas
  for select using (auth.uid() = user_id);
create policy "ventas: insert propio" on ventas
  for insert with check (auth.uid() = user_id);
create policy "ventas: update propio" on ventas
  for update using (auth.uid() = user_id);
create policy "ventas: delete propio" on ventas
  for delete using (auth.uid() = user_id);
