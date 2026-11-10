DO $$
BEGIN
  IF EXISTS (
    SELECT lower(btrim(email))
    FROM veterinarians
    WHERE email IS NOT NULL
      AND btrim(email) <> ''
    GROUP BY lower(btrim(email))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate veterinarian email addresses exist; resolve them before applying this migration.';
  END IF;

  IF EXISTS (
    SELECT btrim(phone_number)
    FROM veterinarians
    WHERE phone_number IS NOT NULL
      AND btrim(phone_number) <> ''
    GROUP BY btrim(phone_number)
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate veterinarian phone numbers exist; resolve them before applying this migration.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS veterinarians_email_unique
  ON veterinarians (lower(btrim(email)))
  WHERE email IS NOT NULL
    AND btrim(email) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS veterinarians_phone_unique
  ON veterinarians (btrim(phone_number))
  WHERE phone_number IS NOT NULL
    AND btrim(phone_number) <> '';
