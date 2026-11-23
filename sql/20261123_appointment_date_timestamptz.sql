-- Preserve existing dates as midnight in the database's configured time zone.
ALTER TABLE appointments
  ALTER COLUMN appointment_date TYPE TIMESTAMPTZ
  USING appointment_date::timestamp AT TIME ZONE current_setting('TimeZone');
