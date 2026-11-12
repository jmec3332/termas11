CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE public.admin_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  password_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_settings TO service_role;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.admin_settings (id, password_hash) VALUES (1, encode(extensions.digest('admin1234', 'sha256'), 'hex'));

CREATE TABLE public.daily_stats (
  day date PRIMARY KEY,
  reservas int NOT NULL DEFAULT 0 CHECK (reservas >= 0),
  cancelaciones int NOT NULL DEFAULT 0 CHECK (cancelaciones >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.daily_stats TO service_role;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;