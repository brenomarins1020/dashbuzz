-- Regenerate all meeting_occurrences to start from 2026-01-01 respecting day-of-week
DO $$
DECLARE
  m RECORD;
  occ_date DATE;
  end_dt DATE;
  step INTERVAL;
  original_start DATE;
  min_date DATE := '2026-01-01';
  effective_start DATE;
BEGIN
  -- Delete all existing occurrences
  DELETE FROM public.attendance_records WHERE occurrence_id IN (
    SELECT id FROM public.meeting_occurrences
  );
  DELETE FROM public.meeting_occurrences;
  
  -- Regenerate for each meeting
  FOR m IN SELECT * FROM public.meetings LOOP
    original_start := m.date;
    
    IF m.recurrence = 'none' THEN
      occ_date := GREATEST(original_start, min_date);
      INSERT INTO public.meeting_occurrences (meeting_id, workspace_id, occurrence_date, cancelled)
      VALUES (m.id, m.workspace_id, occ_date, false);
      CONTINUE;
    END IF;
    
    -- Determine step
    IF m.recurrence = 'weekly' THEN
      step := INTERVAL '1 week';
    ELSIF m.recurrence = 'biweekly' THEN
      step := INTERVAL '2 weeks';
    ELSIF m.recurrence = 'monthly' THEN
      step := INTERVAL '1 month';
    ELSE
      CONTINUE;
    END IF;
    
    -- Find first occurrence >= min_date that preserves original day pattern
    effective_start := original_start;
    WHILE effective_start < min_date LOOP
      effective_start := effective_start + step;
    END LOOP;
    
    -- End date
    end_dt := COALESCE(m.recurrence_end_date, (CURRENT_DATE + INTERVAL '12 months')::date);
    
    -- Generate occurrences
    occ_date := effective_start;
    WHILE occ_date <= end_dt LOOP
      INSERT INTO public.meeting_occurrences (meeting_id, workspace_id, occurrence_date, cancelled)
      VALUES (m.id, m.workspace_id, occ_date, false);
      occ_date := occ_date + step;
      -- Safety limit
      EXIT WHEN occ_date > end_dt + INTERVAL '1 day';
    END LOOP;
  END LOOP;
END $$;