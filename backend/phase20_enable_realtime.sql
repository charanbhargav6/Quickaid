-- Enable real-time for tasks table to allow Web/App coordination via WebSockets
BEGIN;
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'tasks'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
    END IF;
  END
  $$;
COMMIT;
