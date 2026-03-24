
-- Tabela de mapeamento: nome da pessoa → email
CREATE TABLE public.person_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sem RLS pois é uma ferramenta interna sem autenticação
ALTER TABLE public.person_emails DISABLE ROW LEVEL SECURITY;

-- Tabela de log de emails enviados (para evitar duplicatas)
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_title TEXT NOT NULL,
  content_date DATE NOT NULL,
  content_type TEXT NOT NULL,
  responsible_name TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (content_title, content_date, content_type)
);

ALTER TABLE public.email_logs DISABLE ROW LEVEL SECURITY;
