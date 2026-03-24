
-- Create posts table
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conteudo text NOT NULL,
  local text NOT NULL DEFAULT 'projec_jr',
  responsavel text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'não começada',
  data_postagem date NOT NULL DEFAULT CURRENT_DATE,
  link_canva text NOT NULL DEFAULT '',
  tipo_conteudo text NOT NULL DEFAULT 'institucional',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Fully public policies
CREATE POLICY "Allow public read on posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Allow public insert on posts" ON public.posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on posts" ON public.posts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on posts" ON public.posts FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
