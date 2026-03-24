
ALTER TABLE public.workspaces 
  ADD COLUMN task_cat1_label text NOT NULL DEFAULT 'Categoria 1',
  ADD COLUMN task_cat2_label text NOT NULL DEFAULT 'Categoria 2';
