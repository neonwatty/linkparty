-- Migration 031: Add search_path restriction to SECURITY DEFINER functions
--
-- SECURITY DEFINER functions execute with the privileges of the function owner
-- (typically postgres). Without a restricted search_path, a malicious user could
-- create objects in the public schema that shadow system objects and get executed
-- with elevated privileges.
--
-- Fix: Set search_path = '' (empty) on all SECURITY DEFINER functions.

-- 1. link_user_to_party_member (from migration 003)
ALTER FUNCTION link_user_to_party_member() SET search_path = '';

-- 2. link_user_to_push_token (from migration 004)
ALTER FUNCTION link_user_to_push_token() SET search_path = '';

-- 3. handle_new_user (from migration 016)
ALTER FUNCTION public.handle_new_user() SET search_path = '';
