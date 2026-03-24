
CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'Em Andamento',
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on stories"
  ON public.stories FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on stories"
  ON public.stories FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on stories"
  ON public.stories FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on stories"
  ON public.stories FOR DELETE
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
