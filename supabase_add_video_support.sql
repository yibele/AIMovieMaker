-- Update materials table to support video type
-- Run this in your Supabase SQL Editor

-- 1. Drop the existing check constraint on 'type' column if it exists
-- Note: The default name is usually materials_type_check, but it might vary.
-- We try to drop it by name. If your constraint has a different name, you might need to find it first.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'materials_type_check'
  ) THEN
    ALTER TABLE public.materials DROP CONSTRAINT materials_type_check;
  END IF;
END $$;

-- 2. Add the new check constraint supporting both 'image' and 'video'
ALTER TABLE public.materials 
ADD CONSTRAINT materials_type_check 
CHECK (type IN ('image', 'video'));

-- 3. Verify the table structure (Optional, just for confirmation)
-- The 'type' column should now accept 'video'.
