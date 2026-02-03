-- Create the storage bucket for images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on objects (it usually is enabled by default, but good practice to ensure)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view images in the 'images' bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'images' );

-- Policy: Only Admins can upload to the 'images' bucket
CREATE POLICY "Admin Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'images'
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Policy: Only Admins can update images in the 'images' bucket
CREATE POLICY "Admin Update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'images'
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Policy: Only Admins can delete images in the 'images' bucket
CREATE POLICY "Admin Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'images'
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
