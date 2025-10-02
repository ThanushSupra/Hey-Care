-- Update RLS policies to allow public access since no authentication is required
DROP POLICY IF EXISTS "Users can view their own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can create their own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can update their own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can delete their own patients" ON public.patients;

-- Create public access policies
CREATE POLICY "Anyone can view patients" 
ON public.patients 
FOR SELECT 
TO public
USING (true);

CREATE POLICY "Anyone can create patients" 
ON public.patients 
FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can update patients" 
ON public.patients 
FOR UPDATE 
TO public
USING (true);

CREATE POLICY "Anyone can delete patients" 
ON public.patients 
FOR DELETE 
TO public
USING (true);

-- Make user_id nullable since we're not using authentication
ALTER TABLE public.patients ALTER COLUMN user_id DROP NOT NULL;