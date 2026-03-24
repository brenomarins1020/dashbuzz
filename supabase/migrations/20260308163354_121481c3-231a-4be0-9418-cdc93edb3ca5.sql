
ALTER TABLE public.posts ADD COLUMN deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.stories ADD COLUMN deleted_at timestamptz DEFAULT NULL;
