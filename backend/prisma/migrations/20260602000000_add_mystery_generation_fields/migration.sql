CREATE TABLE IF NOT EXISTS "mysteries" (
  "id" TEXT PRIMARY KEY,
  "date" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "image" TEXT NOT NULL DEFAULT 'hero',
  "answer" TEXT NOT NULL,
  "aliases" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "tips" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "explanation" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE "mysteries"
  ADD COLUMN IF NOT EXISTS "difficulty" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "image_prompt" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "image_url" TEXT,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PENDING';

CREATE UNIQUE INDEX IF NOT EXISTS "mysteries_date_key" ON "mysteries"("date");
CREATE UNIQUE INDEX IF NOT EXISTS "mysteries_answer_key" ON "mysteries"("answer");

CREATE TABLE IF NOT EXISTS "submissions" (
  "id" TEXT PRIMARY KEY,
  "mystery_id" TEXT NOT NULL REFERENCES "mysteries"("id") ON DELETE CASCADE,
  "player_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "started_at" TIMESTAMPTZ NOT NULL,
  "solved_at" TIMESTAMPTZ,
  "hints_used" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("mystery_id", "player_id")
);

CREATE TABLE IF NOT EXISTS "social_posts" (
  "id" TEXT PRIMARY KEY,
  "mystery_id" TEXT NOT NULL REFERENCES "mysteries"("id") ON DELETE CASCADE,
  "date" TEXT NOT NULL,
  "time" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "text" TEXT NOT NULL,
  "image_url" TEXT,
  "link" TEXT,
  "publish_mode" TEXT NOT NULL DEFAULT 'manual',
  "posted_at" TIMESTAMPTZ,
  "posted_by" TEXT,
  "external_post_id" TEXT,
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
