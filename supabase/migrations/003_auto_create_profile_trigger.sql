-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 003: Auto-create profile on user signup
-- 
-- This trigger automatically creates a profile row when a new user signs up
-- via Supabase Auth. It uses SECURITY DEFINER so it bypasses RLS policies,
-- solving the 401/42501 error when the client tries to INSERT into profiles
-- before a session is fully established (e.g., when email confirmation is ON).
--
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop existing trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    ),
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'username', '') = 'admin' THEN 'admin'
      ELSE 'player'
    END
  );
  RETURN NEW;
EXCEPTION WHEN unique_violation THEN
  -- Profile already exists (e.g., from a previous attempt), ignore
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
