-- 2026-11-13 사용자 결정: 안 쓰는 테이블·칸 정리 (코드 어디에서도 쓰지 않는 것만)
-- _old_fsfs_* 3개는 세이브(fsfs_save.data)와 무관함을 확인: inventory·outfit은 0줄, meta는 예전 변환 표시 2줄뿐.
drop table if exists public._old_fsfs_inventory, public._old_fsfs_outfit, public._old_fsfs_meta;
drop table if exists public.fsfs_keymap;
alter table public.didi_category drop column if exists kind, drop column if exists status;
alter table public.didi_index drop column if exists kind, drop column if exists status;
alter table public.fsfs_item drop column if exists created_by;
alter table public.fsfs_place drop column if exists move_min;
alter table public.fsfs_save drop column if exists game_day, drop column if exists state;
alter table public.bkbk_books drop column if exists legacy_id;
alter table public.bkbk_logs drop column if exists legacy_id;
alter table public.bkbk_series drop column if exists legacy_id;
alter table public.bkbk_tags drop column if exists legacy_id;
alter table public.bkbk_texts drop column if exists legacy_id;
alter table public.bkbk_word_use drop column if exists legacy_id;
alter table public.mgwg_item drop column if exists legacy_id;
alter table public.mgwg_sort drop column if exists legacy_id;
alter table public.mgwg_store drop column if exists legacy_id;
