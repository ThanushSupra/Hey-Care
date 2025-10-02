-- First check and drop existing policies properly
DO $$ 
BEGIN
    -- Drop all existing policies on patients table
    DROP POLICY IF EXISTS "Users can view their own patients" ON public.patients;
    DROP POLICY IF EXISTS "Users can create their own patients" ON public.patients;
    DROP POLICY IF EXISTS "Users can update their own patients" ON public.patients;
    DROP POLICY IF EXISTS "Users can delete their own patients" ON public.patients;
    DROP POLICY IF EXISTS "Anyone can view patients" ON public.patients;
    DROP POLICY IF EXISTS "Anyone can create patients" ON public.patients;
    DROP POLICY IF EXISTS "Anyone can update patients" ON public.patients;
    DROP POLICY IF EXISTS "Anyone can delete patients" ON public.patients;
EXCEPTION
    WHEN undefined_object THEN
        NULL; -- Ignore if policies don't exist
END $$;

-- Create public access policies
CREATE POLICY "Public can view all patients" 
ON public.patients 
FOR SELECT 
USING (true);

CREATE POLICY "Public can create patients" 
ON public.patients 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public can update patients" 
ON public.patients 
FOR UPDATE 
USING (true);

CREATE POLICY "Public can delete patients" 
ON public.patients 
FOR DELETE 
USING (true);

-- Make user_id nullable since we're not using authentication
ALTER TABLE public.patients ALTER COLUMN user_id DROP NOT NULL;