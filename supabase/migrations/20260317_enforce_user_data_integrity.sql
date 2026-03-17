-- Ensure per-user game data is always isolated and non-duplicated.
-- This migration:
-- 1) Deduplicates existing rows.
-- 2) Adds unique constraints to prevent future duplicates.

begin;

-- =====================================================
-- level_progress: one row per (user_id, level_id)
-- Keep "best" merged progress when duplicates exist.
-- =====================================================
with duplicate_keys as (
  select user_id, level_id
  from public.level_progress
  group by user_id, level_id
  having count(*) > 1
), merged as (
  select
    lp.user_id,
    lp.level_id,
    max(lp.dimsum_collected) as dimsum_collected,
    max(lp.dimsum_total) as dimsum_total,
    max(lp.stars) as stars,
    bool_or(lp.completed) as completed,
    coalesce(min(nullif(lp.best_time, 0)), 0) as best_time,
    min(lp.created_at) as created_at,
    now() as updated_at
  from public.level_progress lp
  inner join duplicate_keys dk
    on dk.user_id = lp.user_id
   and dk.level_id = lp.level_id
  group by lp.user_id, lp.level_id
), deleted as (
  delete from public.level_progress lp
  using duplicate_keys dk
  where lp.user_id = dk.user_id
    and lp.level_id = dk.level_id
  returning 1
)
insert into public.level_progress (
  user_id,
  level_id,
  dimsum_collected,
  dimsum_total,
  stars,
  completed,
  best_time,
  created_at,
  updated_at
)
select
  m.user_id,
  m.level_id,
  m.dimsum_collected,
  m.dimsum_total,
  m.stars,
  m.completed,
  m.best_time,
  m.created_at,
  m.updated_at
from merged m;

create unique index if not exists level_progress_user_level_uidx
  on public.level_progress (user_id, level_id);

-- =====================================================
-- inventory: one row per (user_id, item_name)
-- Merge duplicate quantities into one canonical row.
-- =====================================================
with duplicate_keys as (
  select user_id, item_name
  from public.inventory
  group by user_id, item_name
  having count(*) > 1
), merged as (
  select
    i.user_id,
    i.item_name,
    max(i.item_description) as item_description,
    max(i.item_icon) as item_icon,
    max(i.item_type) as item_type,
    sum(i.quantity) as quantity,
    bool_or(i.redeemed) as redeemed,
    max(i.redeemed_at) as redeemed_at,
    max(i.source) as source,
    min(i.created_at) as created_at
  from public.inventory i
  inner join duplicate_keys dk
    on dk.user_id = i.user_id
   and dk.item_name = i.item_name
  group by i.user_id, i.item_name
), deleted as (
  delete from public.inventory i
  using duplicate_keys dk
  where i.user_id = dk.user_id
    and i.item_name = dk.item_name
  returning 1
)
insert into public.inventory (
  user_id,
  item_name,
  item_description,
  item_icon,
  item_type,
  quantity,
  redeemed,
  redeemed_at,
  source,
  created_at
)
select
  m.user_id,
  m.item_name,
  m.item_description,
  m.item_icon,
  m.item_type,
  m.quantity,
  m.redeemed,
  m.redeemed_at,
  m.source,
  m.created_at
from merged m;

create unique index if not exists inventory_user_item_name_uidx
  on public.inventory (user_id, item_name);

-- =====================================================
-- leaderboard: one row per user_id
-- Keep highest score row when duplicates exist.
-- =====================================================
with duplicate_users as (
  select user_id
  from public.leaderboard
  group by user_id
  having count(*) > 1
), chosen as (
  select distinct on (l.user_id)
    l.user_id,
    l.player_name,
    l.profile_photo,
    l.total_dimsum,
    l.levels_completed,
    l.total_stars,
    l.created_at
  from public.leaderboard l
  inner join duplicate_users du
    on du.user_id = l.user_id
  order by
    l.user_id,
    l.total_dimsum desc,
    l.total_stars desc,
    l.levels_completed desc,
    l.created_at desc
), deleted as (
  delete from public.leaderboard l
  using duplicate_users du
  where l.user_id = du.user_id
  returning 1
)
insert into public.leaderboard (
  user_id,
  player_name,
  profile_photo,
  total_dimsum,
  levels_completed,
  total_stars,
  created_at
)
select
  c.user_id,
  c.player_name,
  c.profile_photo,
  c.total_dimsum,
  c.levels_completed,
  c.total_stars,
  c.created_at
from chosen c;

create unique index if not exists leaderboard_user_uidx
  on public.leaderboard (user_id);

commit;

