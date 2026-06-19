-- ============================================================
-- MIGRAÇÃO 005: Banca inicial ZERO para novos usuários;
-- Apenas admin01@gmail.com recebe R$ 5.000
-- ============================================================

-- Atualiza o trigger handle_new_user() para definir balance = 0
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, balance, created_at)
  VALUES (NEW.id, NEW.email, 0, NOW())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, first_name, role, real_balance, updated_at)
  VALUES (
    NEW.id,
    COALESCE(SPLIT_PART(NEW.email, '@', 1), 'User'),
    'user',
    0,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Seta R$ 5.000 para o admin (se já existir)
UPDATE public.users
SET balance = 5000
WHERE email = 'admin01@gmail.com';

UPDATE public.profiles
SET real_balance = 5000
WHERE id IN (SELECT id FROM public.users WHERE email = 'admin01@gmail.com');

-- Garante que o admin01 tenha role = 'superadmin'
UPDATE public.profiles
SET role = 'superadmin'
WHERE id IN (SELECT id FROM public.users WHERE email = 'admin01@gmail.com');
