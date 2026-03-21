-- Migration 041: Remove public storage policies and add path-scoping
--
-- Problem: Three auto-generated "Allow public access" policies on storage.objects
-- allow anonymous upload/delete to the queue-images bucket.
-- Fix: Drop them and update authenticated policies to scope by party membership path.

-- Drop the auto-generated public access policies
DROP POLICY IF EXISTS "Allow public access 164sgj8_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access 164sgj8_1" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access 164sgj8_2" ON storage.objects;

-- Replace the existing upload policy with a path-scoped version
-- Users can only upload to folders matching party IDs they are members of
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'queue-images'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM party_members pm
      WHERE pm.user_id = auth.uid()
        AND pm.party_id::text = (storage.foldername(name))[1]
    )
  );

-- Replace the existing delete policy with a path-scoped version
DROP POLICY IF EXISTS "Authenticated users can delete own images" ON storage.objects;
CREATE POLICY "Authenticated users can delete own images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'queue-images'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM party_members pm
      WHERE pm.user_id = auth.uid()
        AND pm.party_id::text = (storage.foldername(name))[1]
    )
  );

-- Keep the public read policy (images need to be viewable by all party members)
-- "Public read access for queue images" from migration 037 remains unchanged.
