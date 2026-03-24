
-- Habilitar RLS com políticas permissivas (app interna sem auth de usuário)
ALTER TABLE public.person_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on person_emails" ON public.person_emails FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on email_logs" ON public.email_logs FOR ALL USING (true) WITH CHECK (true);
