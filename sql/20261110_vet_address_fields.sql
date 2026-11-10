ALTER TABLE veterinarians
  ADD COLUMN IF NOT EXISTS street VARCHAR,
  ADD COLUMN IF NOT EXISTS house_number VARCHAR,
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR,
  ADD COLUMN IF NOT EXISTS city VARCHAR;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'veterinarians'
      AND column_name = 'address'
  ) THEN
    EXECUTE '
      UPDATE veterinarians
      SET city = address
      WHERE city IS NULL
        AND address IS NOT NULL
    ';
  END IF;
END $$;

ALTER TABLE veterinarians
  DROP COLUMN IF EXISTS address;
