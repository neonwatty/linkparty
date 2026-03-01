-- Create the queue-images bucket (referenced by lib/imageUpload.ts)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('queue-images', 'queue-images', true, 5242880)  -- 5MB limit
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload to their party's folder
CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'queue-images' AND auth.role() = 'authenticated');

-- RLS: anyone can view (public bucket)
CREATE POLICY "Public read access for queue images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'queue-images');

-- RLS: authenticated users can delete their uploads
CREATE POLICY "Authenticated users can delete own images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'queue-images' AND auth.role() = 'authenticated');
