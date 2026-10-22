-- Extend existing upload formats without changing bucket access or the size limit.
update storage.buckets
set allowed_mime_types = array(
  select distinct mime
  from unnest(allowed_mime_types || array[
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/csv','text/plain','text/markdown','application/json',
    'application/rtf','application/vnd.oasis.opendocument.text'
  ]::text[]) as mime
  order by mime
)
where id = 'company-documents' and allowed_mime_types is not null;
