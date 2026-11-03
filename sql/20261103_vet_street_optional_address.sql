DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM veterinarians
    WHERE first_name IS NULL
      OR btrim(first_name) = ''
      OR last_name IS NULL
      OR btrim(last_name) = ''
      OR email IS NULL
      OR btrim(email) = ''
      OR phone IS NULL
      OR btrim(phone) = ''
  ) THEN
    RAISE EXCEPTION 'Veterinarians with a missing name, email, or phone must be corrected before applying this migration.';
  END IF;
END $$;

ALTER TABLE veterinarians
  ADD COLUMN IF NOT EXISTS street VARCHAR;

ALTER TABLE veterinarians
  ALTER COLUMN street TYPE VARCHAR USING street::VARCHAR,
  ALTER COLUMN street DROP NOT NULL,
  ALTER COLUMN address TYPE VARCHAR USING address::VARCHAR,
  ALTER COLUMN address DROP NOT NULL,
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL,
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN phone SET NOT NULL;
