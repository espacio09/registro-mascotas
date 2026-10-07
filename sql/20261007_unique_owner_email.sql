DO $$
BEGIN
  IF EXISTS (
    SELECT lower(btrim(email))
    FROM owners
    WHERE email IS NOT NULL
      AND btrim(email) <> ''
    GROUP BY lower(btrim(email))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate owner email addresses exist; resolve them before applying this migration.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS owners_email_unique
  ON owners (lower(btrim(email)))
  WHERE email IS NOT NULL
    AND btrim(email) <> '';
