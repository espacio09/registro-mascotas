ALTER TABLE veterinarians
  ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'veterinarians'
      AND column_name = 'phone'
  ) THEN
    EXECUTE '
      UPDATE veterinarians
      SET phone_number = phone
      WHERE phone_number IS NULL
        AND phone IS NOT NULL
    ';
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

DROP INDEX IF EXISTS veterinarians_phone_unique;

CREATE UNIQUE INDEX veterinarians_phone_unique
  ON veterinarians (btrim(phone_number))
  WHERE phone_number IS NOT NULL
    AND btrim(phone_number) <> '';
