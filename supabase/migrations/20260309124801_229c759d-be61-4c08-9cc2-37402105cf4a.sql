-- 1) Add icon_key to publishing_profiles with valid migration from platform
ALTER TABLE public.publishing_profiles ADD COLUMN icon_key text NOT NULL DEFAULT 'instagram';

-- Migrate existing platform values to icon_key
UPDATE public.publishing_profiles
SET icon_key = CASE
  WHEN LOWER(platform) IN ('instagram','tiktok','linkedin','youtube','blog','site','newsletter','whatsapp','pinterest','twitter','facebook')
    THEN LOWER(platform)
  ELSE 'instagram'
END;

-- Add check constraint
ALTER TABLE public.publishing_profiles
ADD CONSTRAINT publishing_profiles_icon_key_check
CHECK (icon_key IN ('instagram','tiktok','linkedin','youtube','blog','site','newsletter','whatsapp','pinterest','twitter','facebook'));

-- Drop platform column
ALTER TABLE public.publishing_profiles DROP COLUMN platform;

-- 2) Add icon_key to content_categories
ALTER TABLE public.content_categories ADD COLUMN icon_key text NOT NULL DEFAULT 'instagram';

ALTER TABLE public.content_categories
ADD CONSTRAINT content_categories_icon_key_check
CHECK (icon_key IN ('instagram','tiktok','linkedin','youtube','blog','site','newsletter','whatsapp','pinterest','twitter','facebook'));

-- 3) Update workspace defaults trigger
CREATE OR REPLACE FUNCTION public.fn_populate_workspace_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert default categories with icon_key
  INSERT INTO public.content_categories (workspace_id, name, color, icon_key, sort_order, is_active)
  VALUES
    (NEW.id, 'Institucional', '#3b82f6', 'instagram', 0, true),
    (NEW.id, 'Educacional', '#10b981', 'blog', 1, true),
    (NEW.id, 'Portfólio', '#8b5cf6', 'youtube', 2, true),
    (NEW.id, 'Comemorativo', '#f59e0b', 'newsletter', 3, true);

  -- Insert default statuses
  INSERT INTO public.workflow_statuses (workspace_id, name, color, sort_order, is_active)
  VALUES
    (NEW.id, 'Não Começado', '#94a3b8', 0, true),
    (NEW.id, 'Em Andamento', '#eab308', 1, true),
    (NEW.id, 'Pronto', '#3b82f6', 2, true),
    (NEW.id, 'Publicado', '#10b981', 3, true);

  -- Insert only 2 default profiles
  INSERT INTO public.publishing_profiles (workspace_id, name, icon_key, sort_order, is_active)
  VALUES
    (NEW.id, 'Perfil 1', 'instagram', 0, true),
    (NEW.id, 'Perfil 2', 'tiktok', 1, true);

  RETURN NEW;
END;
$function$;