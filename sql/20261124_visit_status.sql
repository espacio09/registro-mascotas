ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS visit_status VARCHAR(30);

UPDATE visits
SET visit_status = CASE status
  WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS'
  WHEN 'COMPLETED' THEN 'COMPLETED'
  WHEN 'CANCELLED' THEN 'FOLLOW_UP_REQUIRED'
  ELSE 'OPEN'
END
WHERE visit_status IS NULL;

ALTER TABLE visits
  ALTER COLUMN visit_status TYPE VARCHAR(30),
  ALTER COLUMN visit_status SET DEFAULT 'OPEN',
  ALTER COLUMN visit_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'visits_visit_status_check'
      AND conrelid = 'visits'::regclass
  ) THEN
    ALTER TABLE visits
      ADD CONSTRAINT visits_visit_status_check
      CHECK (visit_status IN (
        'OPEN',
        'IN_PROGRESS',
        'COMPLETED',
        'FOLLOW_UP_REQUIRED'
      ));
  END IF;
END $$;
