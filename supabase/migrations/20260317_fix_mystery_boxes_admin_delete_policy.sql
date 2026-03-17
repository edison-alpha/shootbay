-- Fix: allow admin to delete mystery boxes via RLS
-- Existing schema has select/insert/update policy, but no delete policy for mystery_boxes.

CREATE POLICY "mystery_boxes_admin_delete" ON public.mystery_boxes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

