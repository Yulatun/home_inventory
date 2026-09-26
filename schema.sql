-- Home Inventory — MVP schema
-- Design notes are in SPEC.md. This file is meant to be run once against a
-- fresh Supabase project (SQL Editor, or as a migration once we scaffold the repo).

create extension if not exists pgcrypto;

-- =========================================================================
-- HOUSEHOLDS
-- =========================================================================
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- HOUSEHOLD MEMBERS
-- MVP: one household per user, enforced by the unique(user_id) constraint.
-- =========================================================================
create table household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  unique (user_id)
);

create index household_members_household_id_idx on household_members(household_id);

-- =========================================================================
-- HOUSEHOLD INVITES
-- MVP: invite link is generated with a token and shared manually (no
-- transactional email yet — see SPEC.md open decisions).
-- =========================================================================
create table household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  email text not null,
  invited_by uuid not null references auth.users(id),
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index household_invites_household_id_idx on household_invites(household_id);
create index household_invites_email_idx on household_invites(lower(email));

-- =========================================================================
-- LOCATIONS
-- Fixed 4-level hierarchy: room -> unit -> shelf -> box.
-- An item can attach at ANY level (e.g. straight in a room), it doesn't have
-- to go all the way down to a box.
-- =========================================================================
create table locations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  parent_id uuid references locations(id) on delete cascade,
  level text not null check (level in ('room', 'unit', 'shelf', 'box')),
  name text not null,
  -- Meaningful only when level = 'unit': what kind of furniture this is.
  -- 'nounit' is the auto-generated placeholder for "no specific furniture".
  unit_type text,
  position int, -- e.g. shelf number, or manual sort order
  created_at timestamptz not null default now(),
  check ((level = 'unit') = (unit_type is not null)),
  check (unit_type is null or unit_type in (
    'nounit', 'wardrobe', 'cupboard', 'couch', 'cabinet', 'drawer',
    'shelving_unit', 'chest', 'desk', 'other'
  ))
);

create index locations_household_id_idx on locations(household_id);
create index locations_parent_id_idx on locations(parent_id);

-- At most one auto-generated "No Unit" per room, and one "No Shelf" per unit.
create unique index locations_one_nounit_per_room
  on locations (parent_id) where level = 'unit' and unit_type = 'nounit';
create unique index locations_one_noshelf_per_unit
  on locations (parent_id) where level = 'shelf' and name = 'No Shelf';

-- Postgres CHECK constraints can't inspect a parent row, so the hierarchy
-- (room has no parent; unit's parent is a room; shelf's parent is a unit;
-- box's parent is a shelf) is enforced with a trigger instead.
create or replace function enforce_location_hierarchy()
returns trigger as $$
declare
  parent_level text;
  expected_parent_level text;
begin
  if new.level = 'room' then
    if new.parent_id is not null then
      raise exception 'a room cannot have a parent location';
    end if;
    return new;
  end if;

  if new.parent_id is null then
    raise exception '% must have a parent location', new.level;
  end if;

  select level into parent_level from locations where id = new.parent_id;

  expected_parent_level := case new.level
    when 'unit' then 'room'
    when 'shelf' then 'unit'
    when 'box' then 'shelf'
  end;

  if parent_level is distinct from expected_parent_level then
    raise exception 'a % must have a % parent, got %', new.level, expected_parent_level, parent_level;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger locations_enforce_hierarchy
  before insert or update on locations
  for each row execute function enforce_location_hierarchy();

-- Auto-create placeholder children so every room is immediately usable
-- without manually setting up furniture first: adding a room creates its
-- "No Unit" child, and adding any unit (including "No Unit") creates its
-- "No Shelf" child. Real furniture/shelves are added later as needed.
create or replace function create_default_child_location()
returns trigger as $$
begin
  if new.level = 'room' then
    insert into locations (household_id, parent_id, level, name, unit_type)
    values (new.household_id, new.id, 'unit', 'No Unit', 'nounit');
  elsif new.level = 'unit' then
    insert into locations (household_id, parent_id, level, name)
    values (new.household_id, new.id, 'shelf', 'No Shelf');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger locations_create_default_children
  after insert on locations
  for each row execute function create_default_child_location();

-- =========================================================================
-- CATEGORIES
-- Custom per household.
-- =========================================================================
create table categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (household_id, name)
);

create index categories_household_id_idx on categories(household_id);

-- =========================================================================
-- ITEMS
-- =========================================================================
create table items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  description text,
  category_id uuid references categories(id) on delete set null,
  location_id uuid references locations(id) on delete set null,
  quantity int not null default 1 check (quantity >= 0),
  photo_url text,
  tags text[] not null default '{}',
  last_used_at date,
  status text not null default 'active' check (status in ('active', 'retired')),
  retired_at timestamptz,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index items_household_id_idx on items(household_id);
create index items_location_id_idx on items(location_id);
create index items_category_id_idx on items(category_id);
create index items_tags_idx on items using gin(tags);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger items_set_updated_at
  before update on items
  for each row execute function set_updated_at();

-- An item's location must resolve all the way to a shelf or box — never a
-- bare room or unit — so "where is it" is always answerable at that
-- granularity. Rooms/units always have a "No Shelf" leaf available (see the
-- locations default-child trigger above), so this is never a dead end.
create or replace function enforce_item_location_level()
returns trigger as $$
declare
  loc_level text;
begin
  if new.location_id is null then
    return new;
  end if;

  select level into loc_level from locations where id = new.location_id;

  if loc_level not in ('shelf', 'box') then
    raise exception 'items must be located at a shelf or box, not a %', loc_level;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger items_enforce_location_level
  before insert or update on items
  for each row execute function enforce_item_location_level();

-- =========================================================================
-- ACTIVITY LOG
-- Append-only audit trail. "One in, one out" is just two log rows
-- (added + removed) rather than a distinct schema concept.
-- =========================================================================
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  item_id uuid references items(id) on delete set null,
  action text not null check (action in ('added', 'removed', 'moved', 'updated')),
  actor_user_id uuid not null references auth.users(id),
  from_location_id uuid references locations(id) on delete set null,
  to_location_id uuid references locations(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index activity_log_household_id_idx on activity_log(household_id);
create index activity_log_item_id_idx on activity_log(item_id);

-- =========================================================================
-- ROW LEVEL SECURITY
-- Every household-scoped table: a user may only read/write rows belonging
-- to a household they're a member of.
-- =========================================================================
alter table households enable row level security;
alter table household_members enable row level security;
alter table household_invites enable row level security;
alter table locations enable row level security;
alter table categories enable row level security;
alter table items enable row level security;
alter table activity_log enable row level security;

-- `security definer` + explicit search_path avoids two footguns: infinite
-- RLS recursion (this function reads household_members, which itself has
-- RLS) and search_path hijacking on security-definer functions.
create or replace function is_household_member(target_household_id uuid)
returns boolean as $$
  select exists (
    select 1 from household_members
    where household_id = target_household_id
      and user_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

-- HOUSEHOLDS
create policy "members can view their household"
  on households for select using (is_household_member(id));
create policy "members can update their household"
  on households for update using (is_household_member(id));
create policy "authenticated users can create a household"
  on households for insert with check (auth.uid() is not null);

-- HOUSEHOLD_MEMBERS
create policy "members can view their household's members"
  on household_members for select using (is_household_member(household_id));

-- These checks must read tables the caller can't see under RLS (a non-member
-- can't see household_members or household_invites rows), so they run as
-- security definer. Doing them inline in the policy would make "household
-- has no members" always true for outsiders, letting anyone self-join any
-- household.
create or replace function household_is_empty(target_household_id uuid)
returns boolean as $$
  select not exists (
    select 1 from household_members where household_id = target_household_id
  );
$$ language sql stable security definer set search_path = public;

create or replace function has_pending_invite(target_household_id uuid)
returns boolean as $$
  select exists (
    select 1 from household_invites
    where household_id = target_household_id
      and status = 'pending'
      and expires_at > now()
      and lower(email) = lower(auth.jwt() ->> 'email')
  );
$$ language sql stable security definer set search_path = public;

create or replace function is_household_owner(target_household_id uuid)
returns boolean as $$
  select exists (
    select 1 from household_members
    where household_id = target_household_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$ language sql stable security definer set search_path = public;

-- Join either as the founding owner of a brand-new household, or as a
-- regular member by redeeming a pending invite sent to your own email.
create policy "users can join via valid invite or as first owner"
  on household_members for insert
  with check (
    user_id = auth.uid()
    and (
      (role = 'owner' and household_is_empty(household_id))
      or (role = 'member' and has_pending_invite(household_id))
    )
  );

create policy "members can leave, owners can remove members"
  on household_members for delete
  using (user_id = auth.uid() or is_household_owner(household_id));

-- HOUSEHOLD_INVITES
create policy "members can view their household's invites"
  on household_invites for select using (is_household_member(household_id));
create policy "members can create invites"
  on household_invites for insert with check (is_household_member(household_id));
create policy "members can update invites"
  on household_invites for update using (is_household_member(household_id));

-- LOCATIONS
create policy "members can view locations"
  on locations for select using (is_household_member(household_id));
create policy "members can insert locations"
  on locations for insert with check (is_household_member(household_id));
create policy "members can update locations"
  on locations for update using (is_household_member(household_id));
create policy "members can delete locations"
  on locations for delete using (is_household_member(household_id));

-- CATEGORIES
create policy "members can view categories"
  on categories for select using (is_household_member(household_id));
create policy "members can insert categories"
  on categories for insert with check (is_household_member(household_id));
create policy "members can update categories"
  on categories for update using (is_household_member(household_id));
create policy "members can delete categories"
  on categories for delete using (is_household_member(household_id));

-- ITEMS
create policy "members can view items"
  on items for select using (is_household_member(household_id));
create policy "members can insert items"
  on items for insert with check (is_household_member(household_id));
create policy "members can update items"
  on items for update using (is_household_member(household_id));
create policy "members can delete items"
  on items for delete using (is_household_member(household_id));

-- ACTIVITY_LOG (append-only from the app's perspective — no update/delete policy)
create policy "members can view activity log"
  on activity_log for select using (is_household_member(household_id));
create policy "members can insert activity log"
  on activity_log for insert with check (is_household_member(household_id));
