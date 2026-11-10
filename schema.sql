-- ════════════════════════════════════════════════════════════
-- ELEV8 EMPIRE — idle tycoon (Business Empire: RichMan style)
-- Standalone schema for its OWN Supabase project.
-- Run this whole file once in the Supabase SQL editor.
-- All game writes go through the empire_* RPC functions below.
-- ════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ── PLAYERS (one row per auth user) ─────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  telegram_id bigint unique,
  username text not null,
  first_name text default '',
  last_name text default '',
  character_gender text default 'male',
  total_ep bigint not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  housing_level int not null default 0,
  rank_label text not null default 'Newcomer',
  referral_code text unique not null default substr(md5(random()::text), 0, 9),
  referred_by uuid references profiles(id),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table profiles enable row level security;
drop policy if exists "allow all profiles" on profiles;
drop policy if exists "read own profile" on profiles;
create policy "read own profile" on profiles for select using (auth.uid() = id);

-- ── CATALOGS ────────────────────────────────────────────────
create table if not exists empire_business_types (
  id text primary key,
  name text not null,
  icon text not null,
  base_cost numeric not null,
  base_income numeric not null,          -- cash per second per level
  unlock_net_worth numeric not null default 0,
  sort int not null default 0
);

create table if not exists empire_assets (
  id text primary key,
  kind text not null check (kind in ('realestate','car','jet','yacht')),
  name text not null,
  price numeric not null,
  income_per_sec numeric not null default 0,   -- real estate only
  prestige int not null default 0,             -- luxury items: +0.1% income per point
  sort int not null default 0
);

create table if not exists empire_market (
  symbol text primary key,
  name text not null,
  kind text not null check (kind in ('stock','crypto')),
  base_price numeric not null,
  volatility numeric not null check (volatility > 0 and volatility < 0.6),
  seed numeric not null default 0
);

-- ── PLAYER DATA ─────────────────────────────────────────────
create table if not exists empire_players (
  user_id uuid primary key references profiles(id) on delete cascade,
  cash numeric not null default 1000,
  net_worth numeric not null default 1000,
  tap_level int not null default 1,
  total_taps bigint not null default 0,
  last_collect_at timestamptz not null default now(),
  last_tap_at timestamptz not null default now(),
  last_daily_on date,
  boost_until timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_empire_players_net_worth on empire_players(net_worth desc);

create table if not exists empire_businesses (
  user_id uuid references profiles(id) on delete cascade,
  business_id text references empire_business_types(id),
  level int not null default 0,
  primary key (user_id, business_id)
);

create table if not exists empire_owned_assets (
  user_id uuid references profiles(id) on delete cascade,
  asset_id text references empire_assets(id),
  qty int not null default 0,
  primary key (user_id, asset_id)
);

create table if not exists empire_holdings (
  user_id uuid references profiles(id) on delete cascade,
  symbol text references empire_market(symbol),
  qty numeric not null default 0,
  avg_cost numeric not null default 0,
  primary key (user_id, symbol)
);

-- ── SEED DATA ───────────────────────────────────────────────
insert into empire_business_types (id, name, icon, base_cost, base_income, unlock_net_worth, sort) values
  ('retail',       'Retail Store',   'store',        100,        0.5,       0,         1),
  ('restaurant',   'Restaurant',     'restaurant',   1200,       5,         500,       2),
  ('taxi',         'Taxi Fleet',     'taxi',         15000,      55,        5000,      3),
  ('construction', 'Construction Co.','construction',180000,     650,       50000,     4),
  ('sports',       'Sports Club',    'sports',       2500000,    8500,      600000,    5),
  ('bank',         'Private Bank',   'bank',         40000000,   130000,    10000000,  6)
on conflict (id) do nothing;

insert into empire_assets (id, kind, name, price, income_per_sec, prestige, sort) values
  ('re_studio',     'realestate','Studio Apartment',      25000,      10,      0, 1),
  ('re_condo',      'realestate','City Condo',            150000,     65,      0, 2),
  ('re_townhouse',  'realestate','Townhouse',             900000,     400,     0, 3),
  ('re_villa',      'realestate','Coastal Villa',         6000000,    2800,    0, 4),
  ('re_penthouse',  'realestate','Skyline Penthouse',     40000000,   19000,   0, 5),
  ('re_estate',     'realestate','Country Estate',        300000000,  150000,  0, 6),
  ('car_hatch',     'car','City Hatchback',               15000,      0,       1, 1),
  ('car_sedan',     'car','Executive Sedan',              60000,      0,       2, 2),
  ('car_suv',       'car','Luxury SUV',                   250000,     0,       3, 3),
  ('car_sports',    'car','Sports Coupe',                 1200000,    0,       5, 4),
  ('car_super',     'car','Supercar',                     8000000,    0,       8, 5),
  ('car_hyper',     'car','Hypercar',                     60000000,   0,       12,6),
  ('jet_light',     'jet','Light Jet',                    5000000,    0,       20,1),
  ('jet_mid',       'jet','Mid-size Jet',                 35000000,   0,       35,2),
  ('jet_heavy',     'jet','Heavy Jet',                    250000000,  0,       60,3),
  ('yacht_sail',    'yacht','Sailing Yacht',              3000000,    0,       25,1),
  ('yacht_motor',   'yacht','Motor Yacht',                25000000,   0,       45,2),
  ('yacht_mega',    'yacht','Mega Yacht',                 400000000,  0,       80,3)
on conflict (id) do nothing;

insert into empire_market (symbol, name, kind, base_price, volatility, seed) values
  ('ELV8', 'Elev8 Corp',       'stock', 50,     0.12, 0.7),
  ('NOVA', 'Nova Tech',        'stock', 120,    0.15, 2.1),
  ('AURM', 'Aurum Mining',     'stock', 30,     0.10, 4.2),
  ('PRSM', 'Prism Energy',     'stock', 75,     0.12, 5.5),
  ('HRBR', 'Harbor Foods',     'stock', 18,     0.08, 1.4),
  ('VLTX', 'Voltix Motors',    'stock', 210,    0.20, 3.3),
  ('ELVT', 'Elev8 Token',      'crypto',0.85,   0.30, 0.3),
  ('BLCK', 'Blockcoin',        'crypto',42000,  0.25, 2.8),
  ('ETHR', 'Etherlight',       'crypto',2400,   0.28, 4.9),
  ('SLRS', 'Solaris',          'crypto',140,    0.35, 1.1),
  ('MOON', 'Moonpup',          'crypto',0.02,   0.40, 5.9)
on conflict (symbol) do nothing;

-- ════════════════════════════════════════════════════════════
-- FUNCTIONS
-- ════════════════════════════════════════════════════════════

-- Deterministic market price (5-minute buckets, no cron needed)
create or replace function empire_price(p_symbol text, p_ts timestamptz default now())
returns numeric as $$
declare
  m empire_market%rowtype;
  t float8;
  f float8;
begin
  select * into m from empire_market where symbol = p_symbol;
  if not found then return null; end if;
  t := floor(extract(epoch from p_ts) / 300) * 300;
  f := 1 + m.volatility::float8 * sin(t / 3400.0 + m.seed::float8)
         + m.volatility::float8 * 0.5 * sin(t / 890.0 + m.seed::float8 * 2);
  return round((m.base_price::float8 * f)::numeric, 6);
end;
$$ language plpgsql stable;

-- Income from businesses (with level milestones) + real estate, before multipliers
create or replace function empire_base_income(p_user_id uuid)
returns numeric as $$
  select
    coalesce((
      select sum(t.base_income * b.level *
        (case when b.level >= 100 then 8 when b.level >= 50 then 4 when b.level >= 25 then 2 else 1 end))
      from empire_businesses b
      join empire_business_types t on t.id = b.business_id
      where b.user_id = p_user_id
    ), 0)
    + coalesce((
      select sum(a.income_per_sec * o.qty)
      from empire_owned_assets o
      join empire_assets a on a.id = o.asset_id
      where o.user_id = p_user_id
    ), 0);
$$ language sql stable security definer;

-- 1 + 5% per Elev8 housing level + 0.1% per luxury prestige point, x2 while boosted
create or replace function empire_multiplier(p_user_id uuid)
returns numeric as $$
declare
  v_housing int;
  v_prestige numeric;
  v_boost timestamptz;
  m numeric;
begin
  select coalesce(housing_level, 0) into v_housing from profiles where id = p_user_id;
  select coalesce(sum(a.prestige * o.qty), 0) into v_prestige
    from empire_owned_assets o join empire_assets a on a.id = o.asset_id
    where o.user_id = p_user_id;
  select boost_until into v_boost from empire_players where user_id = p_user_id;
  m := 1 + 0.05 * coalesce(v_housing, 0) + 0.001 * v_prestige;
  if v_boost is not null and v_boost > now() then m := m * 2; end if;
  return m;
end;
$$ language plpgsql stable security definer;

create or replace function empire_income_per_sec(p_user_id uuid)
returns numeric as $$
  select round(empire_base_income(p_user_id) * empire_multiplier(p_user_id), 4);
$$ language sql stable security definer;

create or replace function empire_calc_networth(p_user_id uuid)
returns numeric as $$
declare v numeric;
begin
  select coalesce(cash, 0) into v from empire_players where user_id = p_user_id;
  v := coalesce(v, 0)
    + coalesce((select sum(t.base_cost * (power(1.15, b.level) - 1) / 0.15)
                from empire_businesses b join empire_business_types t on t.id = b.business_id
                where b.user_id = p_user_id), 0)
    + coalesce((select sum(a.price * o.qty)
                from empire_owned_assets o join empire_assets a on a.id = o.asset_id
                where o.user_id = p_user_id), 0)
    + coalesce((select sum(h.qty * empire_price(h.symbol))
                from empire_holdings h where h.user_id = p_user_id), 0);
  return round(v, 2);
end;
$$ language plpgsql stable security definer;

create or replace function empire_refresh_networth(p_user_id uuid)
returns numeric as $$
declare v numeric;
begin
  v := empire_calc_networth(p_user_id);
  update empire_players set net_worth = v where user_id = p_user_id;
  return v;
end;
$$ language plpgsql security definer;

-- Create the player row on first use
create or replace function empire_init(p_user_id uuid)
returns void as $$
begin
  insert into empire_players (user_id) values (p_user_id) on conflict (user_id) do nothing;
end;
$$ language plpgsql security definer;

-- Settle idle income (offline earnings capped at 12h)
create or replace function empire_collect(p_user_id uuid)
returns jsonb as $$
declare
  v_last timestamptz;
  v_secs numeric;
  v_earned numeric;
begin
  perform empire_init(p_user_id);
  select last_collect_at into v_last from empire_players where user_id = p_user_id for update;
  v_secs := least(greatest(extract(epoch from (now() - v_last)), 0), 43200);
  v_earned := round(empire_income_per_sec(p_user_id) * v_secs, 2);
  update empire_players
     set cash = cash + v_earned, last_collect_at = now()
   where user_id = p_user_id;
  return jsonb_build_object('earned', v_earned, 'seconds', v_secs);
end;
$$ language plpgsql security definer;

-- Tap handler: client batches taps; server caps the rate (anti auto-clicker)
create or replace function empire_tap(p_user_id uuid, p_count int)
returns jsonb as $$
declare
  p empire_players%rowtype;
  v_allowed int;
  v_val numeric;
  v_gain numeric;
begin
  perform empire_assert_me(p_user_id);
  perform empire_collect(p_user_id);
  select * into p from empire_players where user_id = p_user_id for update;
  v_allowed := least(
    greatest(coalesce(p_count, 0), 0),
    120,
    greatest(10, floor(extract(epoch from (now() - p.last_tap_at)) * 12)::int)
  );
  v_val := (p.tap_level * 5 + floor(empire_base_income(p_user_id) * 0.02))
           * (case when p.boost_until is not null and p.boost_until > now() then 2 else 1 end);
  v_gain := v_allowed * v_val;
  update empire_players
     set cash = cash + v_gain, total_taps = total_taps + v_allowed, last_tap_at = now()
   where user_id = p_user_id;
  return jsonb_build_object('accepted', v_allowed, 'earned', v_gain, 'cash', p.cash + v_gain);
end;
$$ language plpgsql security definer;

create or replace function empire_upgrade_tap(p_user_id uuid)
returns jsonb as $$
declare
  p empire_players%rowtype;
  v_cost numeric;
begin
  perform empire_assert_me(p_user_id);
  perform empire_collect(p_user_id);
  select * into p from empire_players where user_id = p_user_id for update;
  v_cost := round(200 * power(1.8, p.tap_level - 1));
  if p.cash < v_cost then
    return jsonb_build_object('error', 'insufficient_funds', 'cost', v_cost);
  end if;
  update empire_players set cash = cash - v_cost, tap_level = tap_level + 1 where user_id = p_user_id;
  perform empire_refresh_networth(p_user_id);
  return jsonb_build_object('success', true, 'cost', v_cost, 'tap_level', p.tap_level + 1);
end;
$$ language plpgsql security definer;

-- Buy / upgrade a business by N levels. Cost of level L -> L+1 is base_cost * 1.15^L
create or replace function empire_buy_business(p_user_id uuid, p_business_id text, p_levels int default 1)
returns jsonb as $$
declare
  t empire_business_types%rowtype;
  v_level int;
  v_cash numeric;
  v_cost numeric;
  v_nw numeric;
begin
  perform empire_assert_me(p_user_id);
  if p_levels is null or p_levels < 1 or p_levels > 100 then
    return jsonb_build_object('error', 'invalid_amount');
  end if;
  select * into t from empire_business_types where id = p_business_id;
  if not found then return jsonb_build_object('error', 'not_found'); end if;

  perform empire_collect(p_user_id);  -- settle income at the old rate first
  select coalesce((select level from empire_businesses
                    where user_id = p_user_id and business_id = p_business_id), 0) into v_level;
  if v_level = 0 then
    v_nw := empire_calc_networth(p_user_id);
    if v_nw < t.unlock_net_worth then return jsonb_build_object('error', 'locked'); end if;
  end if;

  v_cost := round(t.base_cost * power(1.15, v_level) * (power(1.15, p_levels) - 1) / 0.15, 2);
  select cash into v_cash from empire_players where user_id = p_user_id for update;
  if v_cash < v_cost then
    return jsonb_build_object('error', 'insufficient_funds', 'cost', v_cost);
  end if;

  update empire_players set cash = cash - v_cost where user_id = p_user_id;
  insert into empire_businesses (user_id, business_id, level)
  values (p_user_id, p_business_id, p_levels)
  on conflict (user_id, business_id)
  do update set level = empire_businesses.level + p_levels;
  perform empire_refresh_networth(p_user_id);
  return jsonb_build_object('success', true, 'cost', v_cost);
end;
$$ language plpgsql security definer;

create or replace function empire_buy_asset(p_user_id uuid, p_asset_id text, p_qty int default 1)
returns jsonb as $$
declare
  a empire_assets%rowtype;
  v_cash numeric;
  v_cost numeric;
begin
  perform empire_assert_me(p_user_id);
  if p_qty is null or p_qty < 1 or p_qty > 100 then
    return jsonb_build_object('error', 'invalid_amount');
  end if;
  select * into a from empire_assets where id = p_asset_id;
  if not found then return jsonb_build_object('error', 'not_found'); end if;

  perform empire_collect(p_user_id);
  v_cost := a.price * p_qty;
  select cash into v_cash from empire_players where user_id = p_user_id for update;
  if v_cash < v_cost then
    return jsonb_build_object('error', 'insufficient_funds', 'cost', v_cost);
  end if;

  update empire_players set cash = cash - v_cost where user_id = p_user_id;
  insert into empire_owned_assets (user_id, asset_id, qty)
  values (p_user_id, p_asset_id, p_qty)
  on conflict (user_id, asset_id)
  do update set qty = empire_owned_assets.qty + p_qty;
  perform empire_refresh_networth(p_user_id);
  return jsonb_build_object('success', true, 'cost', v_cost);
end;
$$ language plpgsql security definer;

-- Stocks & crypto. p_fraction: share of CASH to spend (buy) or of HOLDING to sell. 0.5% fee.
create or replace function empire_trade(p_user_id uuid, p_symbol text, p_side text, p_fraction numeric)
returns jsonb as $$
declare
  v_price numeric;
  v_cash numeric;
  v_qty numeric;
  v_spend numeric;
  h empire_holdings%rowtype;
  v_proceeds numeric;
  c_fee constant numeric := 0.005;
begin
  perform empire_assert_me(p_user_id);
  if p_fraction is null or p_fraction <= 0 or p_fraction > 1 then
    return jsonb_build_object('error', 'invalid_amount');
  end if;
  v_price := empire_price(p_symbol);
  if v_price is null then return jsonb_build_object('error', 'not_found'); end if;

  perform empire_collect(p_user_id);
  select cash into v_cash from empire_players where user_id = p_user_id for update;

  if p_side = 'buy' then
    v_spend := round(v_cash * p_fraction, 2);
    if v_spend < 1 then return jsonb_build_object('error', 'insufficient_funds'); end if;
    v_qty := (v_spend * (1 - c_fee)) / v_price;
    update empire_players set cash = cash - v_spend where user_id = p_user_id;
    insert into empire_holdings (user_id, symbol, qty, avg_cost)
    values (p_user_id, p_symbol, v_qty, v_price)
    on conflict (user_id, symbol) do update set
      avg_cost = (empire_holdings.qty * empire_holdings.avg_cost + v_qty * v_price)
                 / (empire_holdings.qty + v_qty),
      qty = empire_holdings.qty + v_qty;
    perform empire_refresh_networth(p_user_id);
    return jsonb_build_object('success', true, 'side', 'buy', 'qty', v_qty, 'price', v_price, 'amount', v_spend);

  elsif p_side = 'sell' then
    select * into h from empire_holdings where user_id = p_user_id and symbol = p_symbol for update;
    if not found or h.qty <= 0 then return jsonb_build_object('error', 'nothing_to_sell'); end if;
    v_qty := h.qty * p_fraction;
    v_proceeds := round(v_qty * v_price * (1 - c_fee), 2);
    update empire_players set cash = cash + v_proceeds where user_id = p_user_id;
    if h.qty - v_qty < 0.000000001 then
      delete from empire_holdings where user_id = p_user_id and symbol = p_symbol;
    else
      update empire_holdings set qty = qty - v_qty where user_id = p_user_id and symbol = p_symbol;
    end if;
    perform empire_refresh_networth(p_user_id);
    return jsonb_build_object('success', true, 'side', 'sell', 'qty', v_qty, 'price', v_price, 'amount', v_proceeds);
  end if;

  return jsonb_build_object('error', 'invalid_side');
end;
$$ language plpgsql security definer;

-- Daily reward: 15 min of income + 1,000 per streak day (uses the Elev8 login streak)
create or replace function empire_claim_daily(p_user_id uuid)
returns jsonb as $$
declare
  p empire_players%rowtype;
  v_streak int;
  v_reward numeric;
begin
  perform empire_assert_me(p_user_id);
  perform empire_collect(p_user_id);
  select * into p from empire_players where user_id = p_user_id for update;
  if p.last_daily_on = current_date then
    return jsonb_build_object('error', 'already_claimed');
  end if;
  select coalesce(current_streak, 0) into v_streak from profiles where id = p_user_id;
  v_reward := round(empire_income_per_sec(p_user_id) * 900 + 1000 * (1 + coalesce(v_streak, 0)), 2);
  update empire_players set cash = cash + v_reward, last_daily_on = current_date where user_id = p_user_id;
  perform empire_refresh_networth(p_user_id);
  return jsonb_build_object('success', true, 'reward', v_reward, 'streak', coalesce(v_streak, 0));
end;
$$ language plpgsql security definer;

-- Profit boost: pay 15 min of income, get 30 min of x2 (stacks up to 2h)
create or replace function empire_activate_boost(p_user_id uuid)
returns jsonb as $$
declare
  p empire_players%rowtype;
  v_inc numeric;
  v_cost numeric;
  v_until timestamptz;
begin
  perform empire_assert_me(p_user_id);
  perform empire_collect(p_user_id);
  select * into p from empire_players where user_id = p_user_id for update;
  v_inc := empire_income_per_sec(p_user_id);
  if v_inc <= 0 then return jsonb_build_object('error', 'no_income'); end if;
  v_cost := round(v_inc * 900, 2);
  if p.cash < v_cost then
    return jsonb_build_object('error', 'insufficient_funds', 'cost', v_cost);
  end if;
  v_until := least(
    greatest(coalesce(p.boost_until, now()), now()) + interval '30 minutes',
    now() + interval '2 hours'
  );
  update empire_players set cash = cash - v_cost, boost_until = v_until where user_id = p_user_id;
  return jsonb_build_object('success', true, 'cost', v_cost, 'boost_until', v_until);
end;
$$ language plpgsql security definer;

-- One call that returns everything the client renders
create or replace function empire_get_state(p_user_id uuid)
returns jsonb as $$
declare
  p empire_players%rowtype;
  v_mult numeric;
  v_base numeric;
  v_col jsonb;
begin
  perform empire_assert_me(p_user_id);
  v_col := empire_collect(p_user_id);
  perform empire_refresh_networth(p_user_id);
  select * into p from empire_players where user_id = p_user_id;
  v_mult := empire_multiplier(p_user_id);
  v_base := empire_base_income(p_user_id);

  return jsonb_build_object(
    'cash', p.cash,
    'net_worth', p.net_worth,
    'tap_level', p.tap_level,
    'tap_value', (p.tap_level * 5 + floor(v_base * 0.02))
                 * (case when p.boost_until is not null and p.boost_until > now() then 2 else 1 end),
    'tap_upgrade_cost', round(200 * power(1.8, p.tap_level - 1)),
    'total_taps', p.total_taps,
    'income_per_sec', round(v_base * v_mult, 4),
    'multiplier', v_mult,
    'boost_until', p.boost_until,
    'daily_available', (p.last_daily_on is distinct from current_date),
    'collected', (v_col->>'earned')::numeric,
    'collected_secs', (v_col->>'seconds')::numeric,
    'server_time', now(),

    'businesses', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', t.id, 'name', t.name, 'icon', t.icon,
        'base_cost', t.base_cost, 'base_income', t.base_income,
        'unlock', t.unlock_net_worth,
        'level', coalesce(b.level, 0),
        'income', round(coalesce(b.level, 0) * t.base_income *
          (case when coalesce(b.level, 0) >= 100 then 8 when coalesce(b.level, 0) >= 50 then 4
                when coalesce(b.level, 0) >= 25 then 2 else 1 end) * v_mult, 2)
      ) order by t.sort), '[]'::jsonb)
      from empire_business_types t
      left join empire_businesses b on b.business_id = t.id and b.user_id = p_user_id
    ),

    'assets', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', a.id, 'kind', a.kind, 'name', a.name, 'price', a.price,
        'income_per_sec', a.income_per_sec, 'prestige', a.prestige,
        'qty', coalesce(o.qty, 0)
      ) order by a.kind, a.sort), '[]'::jsonb)
      from empire_assets a
      left join empire_owned_assets o on o.asset_id = a.id and o.user_id = p_user_id
    ),

    'market', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'symbol', m.symbol, 'name', m.name, 'kind', m.kind,
        'price', empire_price(m.symbol),
        'prev_price', empire_price(m.symbol, now() - interval '1 hour'),
        'qty', coalesce(h.qty, 0),
        'avg_cost', coalesce(h.avg_cost, 0)
      ) order by m.kind desc, m.symbol), '[]'::jsonb)
      from empire_market m
      left join empire_holdings h on h.symbol = m.symbol and h.user_id = p_user_id
    )
  );
end;
$$ language plpgsql security definer;

create or replace function empire_leaderboard(p_limit int default 50)
returns jsonb as $$
  select coalesce(jsonb_agg(r order by r.net_worth desc), '[]'::jsonb)
  from (
    select pl.user_id, pr.username, pr.rank_label, pl.net_worth
    from empire_players pl
    join profiles pr on pr.id = pl.user_id
    order by pl.net_worth desc
    limit least(greatest(p_limit, 1), 100)
  ) r;
$$ language sql stable security definer;

-- ── SECURITY ────────────────────────────────────────────────
-- Tables are not readable/writable by the anon key; the client only uses the
-- RPC functions above (security definer). Catalogs are readable for convenience.
alter table empire_business_types enable row level security;
alter table empire_assets         enable row level security;
alter table empire_market         enable row level security;
alter table empire_players        enable row level security;
alter table empire_businesses     enable row level security;
alter table empire_owned_assets   enable row level security;
alter table empire_holdings       enable row level security;

drop policy if exists "read empire_business_types" on empire_business_types;
drop policy if exists "read empire_assets" on empire_assets;
drop policy if exists "read empire_market" on empire_market;
create policy "read empire_business_types" on empire_business_types for select using (true);
create policy "read empire_assets" on empire_assets for select using (true);
create policy "read empire_market" on empire_market for select using (true);

-- ── AUTH ────────────────────────────────────────────────────
create or replace function empire_assert_me(p_user_id uuid) returns void as $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'not_authorized';
  end if;
end;
$$ language plpgsql stable;

create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, username, first_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username',''), split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'username','')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Only logged-in players can call the game functions
revoke execute on all functions in schema public from public, anon;
grant  execute on all functions in schema public to authenticated;

notify pgrst, 'reload schema';
