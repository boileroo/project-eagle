-- RLS policies for bonus_awards and tournament_standings

ALTER TABLE public.bonus_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_standings ENABLE ROW LEVEL SECURITY;

-- bonus_awards
CREATE POLICY "Authenticated users can view bonus awards"
  ON public.bonus_awards FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage bonus awards"
  ON public.bonus_awards FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- tournament_standings
CREATE POLICY "Authenticated users can view tournament standings"
  ON public.tournament_standings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage tournament standings"
  ON public.tournament_standings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
