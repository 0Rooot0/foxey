-- Keep existing avatar ids stable while adding six choices.
alter table public.profiles
  drop constraint if exists profiles_avatar_check,
  add constraint profiles_avatar_check check (avatar is null or avatar between 0 and 17);
