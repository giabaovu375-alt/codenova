
-- Theo dõi tiến độ học từng bài
CREATE TABLE public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_slug text NOT NULL,
  blocks_read int NOT NULL DEFAULT 0,
  total_blocks int NOT NULL DEFAULT 0,
  best_score int NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_slug)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own progress" ON public.lesson_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own progress" ON public.lesson_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own progress" ON public.lesson_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Thành tích từng lần nộp bài
CREATE TABLE public.exercise_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_slug text NOT NULL,
  exercise_id text NOT NULL,
  score int NOT NULL CHECK (score >= 0 AND score <= 10),
  feedback text,
  code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exercise_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own attempts" ON public.exercise_attempts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own attempts" ON public.exercise_attempts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX ON public.exercise_attempts (user_id, created_at DESC);
CREATE INDEX ON public.lesson_progress (user_id);
