create policy "branding_assets_delete_org"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'branding-assets'
  and public.current_organization_id()::text = (storage.foldername(name))[1]
);
