
DROP POLICY "announcements public read" ON public.announcements;
CREATE POLICY "announcements active read" ON public.announcements FOR SELECT USING (is_active = true);
CREATE POLICY "staff read all announcements" ON public.announcements FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
