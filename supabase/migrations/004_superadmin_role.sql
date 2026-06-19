ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin', 'superadmin', 'demo'));

UPDATE profiles SET role = 'superadmin' WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'admin01@gmail.com'
);
