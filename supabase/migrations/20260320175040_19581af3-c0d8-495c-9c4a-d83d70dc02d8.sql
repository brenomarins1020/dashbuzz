
-- Fix the trigger to not insert workflow_statuses since seed_default_profiles already does it
-- Also fix seed_default_profiles to not insert content_categories since the trigger does it
-- The problem: fn_populate_workspace_defaults inserts statuses AND calls seed_default_profiles which also inserts statuses

-- Remove workflow_statuses and content_categories from fn_populate_workspace_defaults 
-- since seed_default_profiles handles them
CREATE OR REPLACE FUNCTION public.fn_populate_workspace_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- seed_default_profiles handles: publishing_profiles, content_categories, 
  -- workflow_statuses, appointment_types, task_category_options
  PERFORM public.seed_default_profiles(NEW.id);
  RETURN NEW;
END;
$function$;
