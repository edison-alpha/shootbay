-- Allow admin users to update any profile row (needed for gifting tickets to other users)
-- Existing policy "profiles_update_own" only allows users to update their own row.

CREATE POLICY "profiles_admin_update_any" ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

