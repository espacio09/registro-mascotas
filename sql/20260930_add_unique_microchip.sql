DO $$
BEGIN
  IF EXISTS (
    SELECT microchip_no
    FROM pets
    WHERE microchip_no IS NOT NULL
    GROUP BY microchip_no
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate microchip numbers exist; resolve them before applying this migration.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS pets_microchip_no_unique
  ON pets (microchip_no)
  WHERE microchip_no IS NOT NULL;