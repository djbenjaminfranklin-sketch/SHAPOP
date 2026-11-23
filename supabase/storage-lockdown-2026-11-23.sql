-- Stockage : suppression des 4 règles « Give anon users access… » qui ouvraient tous les espaces
-- à n'importe qui (lecture, dépôt, remplacement, suppression), et remplacement par des règles limitées.
-- Les espaces publics (avatars, pièces jointes, photos de litige) restent lisibles par leur lien public ;
-- le serveur (service_role) n'est pas concerné par ces règles.

drop policy if exists "Give anon users access to JPG images in folder 1oj01fe_0" on storage.objects;
drop policy if exists "Give anon users access to JPG images in folder 1oj01fe_1" on storage.objects;
drop policy if exists "Give anon users access to JPG images in folder 1oj01fe_2" on storage.objects;
drop policy if exists "Give anon users access to JPG images in folder 1oj01fe_3" on storage.objects;

-- avatars : chacun gère uniquement ses fichiers
--   <uid>/avatar.ext, thumbnails/<uid>/…, items/<uid>/…
create or replace function public.storage_owns_avatar_path(p_name text)
returns boolean language sql stable set search_path = '' as $$
  select coalesce(
    (storage.foldername(p_name))[1] = (select auth.uid())::text
    or ((storage.foldername(p_name))[1] in ('thumbnails', 'items')
        and (storage.foldername(p_name))[2] = (select auth.uid())::text),
    false)
$$;

create policy "avatars_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and public.storage_owns_avatar_path(name));
create policy "avatars_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and public.storage_owns_avatar_path(name));
create policy "avatars_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and public.storage_owns_avatar_path(name))
  with check (bucket_id = 'avatars' and public.storage_owns_avatar_path(name));
create policy "avatars_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and public.storage_owns_avatar_path(name));

-- Pièces jointes : dépôt seulement dans une conversation dont on est participant
--   conversation-attachments/<conversation_id>/<fichier>
create policy "attachments_insert_participant" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'conversation-attachments'
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[2]
        and (select auth.uid()) in (c.participant_1, c.participant_2)
    )
  );
