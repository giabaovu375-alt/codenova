
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles readable by authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Public lookup by username for login (returns email only via RPC below)
create or replace function public.email_for_username(_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email from public.profiles where lower(username) = lower(_username) limit 1;
$$;

grant execute on function public.email_for_username(text) to anon, authenticated;

-- Trigger to create profile after signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
