CREATE TABLE IF NOT EXISTS "archivoOwners" (
  LIKE owners
    INCLUDING DEFAULTS
    INCLUDING GENERATED
    INCLUDING IDENTITY
    INCLUDING STORAGE
    INCLUDING COMMENTS
);

CREATE TABLE IF NOT EXISTS "archivoPets" (
  LIKE pets
    INCLUDING DEFAULTS
    INCLUDING GENERATED
    INCLUDING IDENTITY
    INCLUDING STORAGE
    INCLUDING COMMENTS
);

DO $$
DECLARE
  source_fk record;
  source_schema text;
  archive_table text;
  archive_relation text;
  referenced_relation text;
  source_columns text;
  referenced_columns text;
  constraint_name text;
  match_type text;
  update_action text;
  delete_action text;
  deferrability text;
  validation text;
BEGIN
  SELECT namespace.nspname
  INTO source_schema
  FROM pg_class AS source_table
  JOIN pg_namespace AS namespace ON namespace.oid = source_table.relnamespace
  WHERE source_table.oid = 'owners'::regclass;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = format('%I.%I', source_schema, 'archivoOwners')::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE "archivoOwners"
      ADD CONSTRAINT "archivoOwners_pkey" PRIMARY KEY (owner_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = format('%I.%I', source_schema, 'archivoPets')::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE "archivoPets"
      ADD CONSTRAINT "archivoPets_pkey" PRIMARY KEY (pet_id);
  END IF;

  FOR source_fk IN
    SELECT constraint_row.*
    FROM pg_constraint AS constraint_row
    WHERE constraint_row.contype = 'f'
      AND constraint_row.conrelid IN ('owners'::regclass, 'pets'::regclass)
  LOOP
    archive_table := CASE
      WHEN source_fk.conrelid = 'owners'::regclass THEN 'archivoOwners'
      ELSE 'archivoPets'
    END;
    archive_relation := format('%I.%I', source_schema, archive_table);
    constraint_name := format('archivo_fk_%s', source_fk.oid);

    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = archive_relation::regclass
        AND conname = constraint_name
    ) THEN
      CONTINUE;
    END IF;

    SELECT string_agg(format('%I', attribute.attname), ', ' ORDER BY key.ordinality)
    INTO source_columns
    FROM unnest(source_fk.conkey) WITH ORDINALITY AS key(attnum, ordinality)
    JOIN pg_attribute AS attribute
      ON attribute.attrelid = source_fk.conrelid
      AND attribute.attnum = key.attnum;

    SELECT string_agg(format('%I', attribute.attname), ', ' ORDER BY key.ordinality)
    INTO referenced_columns
    FROM unnest(source_fk.confkey) WITH ORDINALITY AS key(attnum, ordinality)
    JOIN pg_attribute AS attribute
      ON attribute.attrelid = source_fk.confrelid
      AND attribute.attnum = key.attnum;

    IF source_fk.confrelid = 'owners'::regclass THEN
      referenced_relation := format('%I.%I', source_schema, 'archivoOwners');
    ELSIF source_fk.confrelid = 'pets'::regclass THEN
      referenced_relation := format('%I.%I', source_schema, 'archivoPets');
    ELSE
      SELECT format('%I.%I', namespace.nspname, referenced_table.relname)
      INTO referenced_relation
      FROM pg_class AS referenced_table
      JOIN pg_namespace AS namespace
        ON namespace.oid = referenced_table.relnamespace
      WHERE referenced_table.oid = source_fk.confrelid;
    END IF;

    match_type := CASE source_fk.confmatchtype
      WHEN 'f' THEN 'FULL'
      WHEN 'p' THEN 'PARTIAL'
      ELSE 'SIMPLE'
    END;
    update_action := CASE source_fk.confupdtype
      WHEN 'r' THEN 'RESTRICT'
      WHEN 'c' THEN 'CASCADE'
      WHEN 'n' THEN 'SET NULL'
      WHEN 'd' THEN 'SET DEFAULT'
      ELSE 'NO ACTION'
    END;
    delete_action := CASE source_fk.confdeltype
      WHEN 'r' THEN 'RESTRICT'
      WHEN 'c' THEN 'CASCADE'
      WHEN 'n' THEN 'SET NULL'
      WHEN 'd' THEN 'SET DEFAULT'
      ELSE 'NO ACTION'
    END;
    deferrability := CASE
      WHEN source_fk.condeferrable AND source_fk.condeferred
        THEN 'DEFERRABLE INITIALLY DEFERRED'
      WHEN source_fk.condeferrable
        THEN 'DEFERRABLE INITIALLY IMMEDIATE'
      ELSE 'NOT DEFERRABLE'
    END;
    validation := CASE WHEN source_fk.convalidated THEN '' ELSE ' NOT VALID' END;

    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%s) REFERENCES %s (%s) MATCH %s ON UPDATE %s ON DELETE %s %s%s',
      archive_relation,
      constraint_name,
      source_columns,
      referenced_relation,
      referenced_columns,
      match_type,
      update_action,
      delete_action,
      deferrability,
      validation
    );
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_row
    WHERE constraint_row.conrelid =
        format('%I.%I', source_schema, 'archivoPets')::regclass
      AND constraint_row.contype = 'f'
      AND constraint_row.confrelid =
        format('%I.%I', source_schema, 'archivoOwners')::regclass
      AND constraint_row.conkey = ARRAY[
        (
          SELECT attribute.attnum
          FROM pg_attribute AS attribute
          WHERE attribute.attrelid =
              format('%I.%I', source_schema, 'archivoPets')::regclass
            AND attribute.attname = 'owner_id'
        )
      ]::smallint[]
  ) THEN
    ALTER TABLE "archivoPets"
      ADD CONSTRAINT "archivoPets_owner_id_fkey"
      FOREIGN KEY (owner_id)
      REFERENCES "archivoOwners" (owner_id);
  END IF;
END $$;
