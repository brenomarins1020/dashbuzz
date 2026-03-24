-- Delete all existing occurrences and attendance records for the meeting
DELETE FROM public.attendance_records WHERE occurrence_id IN (
  SELECT id FROM public.meeting_occurrences WHERE meeting_id = '4410226b-1f28-4ee1-8dab-c18c240ee760'
);
DELETE FROM public.meeting_occurrences WHERE meeting_id = '4410226b-1f28-4ee1-8dab-c18c240ee760';

-- Regenerate weekly from 2026-01-14 up to 2027-03-14 (12 months out)
INSERT INTO public.meeting_occurrences (meeting_id, workspace_id, occurrence_date, cancelled)
SELECT 
  '4410226b-1f28-4ee1-8dab-c18c240ee760',
  'f424bb3f-2ecc-4b5e-9876-1ae609b78d2e',
  d::date,
  false
FROM generate_series('2026-01-14'::date, '2027-03-14'::date, '7 days'::interval) AS d;

-- Update the meeting's base date to 2026-01-14
UPDATE public.meetings SET date = '2026-01-14' WHERE id = '4410226b-1f28-4ee1-8dab-c18c240ee760';