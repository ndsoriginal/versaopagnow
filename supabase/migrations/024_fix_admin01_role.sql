UPDATE public.profiles
SET role = 'superadmin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'admin01@gmail.com'
)
AND (role IS NULL OR role NOT IN ('admin', 'superadmin'));

UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'jhonatas553@gmail.com'
)
AND (role IS NULL OR role NOT IN ('admin', 'superadmin'));
