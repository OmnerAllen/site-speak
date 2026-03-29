-- MVP migration for project detail + stage detail support
-- Safe to run multiple times.

ALTER TABLE project
  ADD COLUMN IF NOT EXISTS overview TEXT NOT NULL DEFAULT '';

ALTER TABLE stage
  ADD COLUMN IF NOT EXISTS details TEXT NOT NULL DEFAULT '';

ALTER TABLE stage
  ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_stage_project_name_active
  ON stage(project_id, name)
  WHERE deleted_at IS NULL;

-- Backfill any missing required stages per project.
INSERT INTO stage (project_id, name)
SELECT p.id, required.name
FROM project p
CROSS JOIN (VALUES ('demo'), ('prep'), ('build/install'), ('qa')) AS required(name)
LEFT JOIN stage s
  ON s.project_id = p.id
 AND s.name = required.name
 AND s.deleted_at IS NULL
WHERE p.deleted_at IS NULL
  AND s.id IS NULL;
