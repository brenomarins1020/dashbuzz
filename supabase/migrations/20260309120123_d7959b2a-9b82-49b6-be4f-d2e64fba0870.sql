
-- Fix audit log function to handle tables without title column gracefully
CREATE OR REPLACE FUNCTION public.fn_audit_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _action text;
  _entity_id uuid;
  _workspace_id uuid;
  _user_id uuid;
  _meta jsonb;
  _row_json jsonb;
BEGIN
  _user_id := auth.uid();

  IF TG_OP = 'DELETE' THEN
    _action := 'permanent_delete';
    _entity_id := OLD.id;
    _workspace_id := OLD.workspace_id;
    _row_json := to_jsonb(OLD);
  ELSE
    _entity_id := NEW.id;
    _workspace_id := NEW.workspace_id;
    _row_json := to_jsonb(NEW);

    IF TG_OP = 'INSERT' THEN
      _action := 'insert';
    ELSIF TG_OP = 'UPDATE' THEN
      _action := 'update';
      IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
        _action := 'soft_delete';
      ELSIF (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL) THEN
        _action := 'restore';
      END IF;
    END IF;
  END IF;

  _meta := jsonb_build_object('title', COALESCE(
    _row_json->>'title',
    _row_json->>'conteudo',
    _row_json->>'nome',
    _row_json->>'name',
    ''
  ));

  INSERT INTO public.audit_logs (workspace_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (_workspace_id, _user_id, _action, TG_TABLE_NAME, _entity_id, _meta);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;
