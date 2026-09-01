-- RPC function to atomically change viewer count for a stream
-- Run this in Supabase SQL editor or psql connected to your DB.

CREATE OR REPLACE FUNCTION public.change_viewers(
  stream_id text,
  delta integer
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  current_count integer;
  new_count integer;
BEGIN
  -- Attempt to update existing row atomically
  LOOP
    SELECT viewers INTO current_count FROM public.live_stats WHERE stream_id = stream_id FOR UPDATE;

    IF NOT FOUND THEN
      -- Insert new row with initial viewers value (max(delta,0))
      new_count := GREATEST(0, COALESCE(delta, 0));
      INSERT INTO public.live_stats (stream_id, viewers, updated_at) VALUES (stream_id, new_count, now());
      RETURN new_count;
    END IF;

    new_count := GREATEST(0, COALESCE(current_count, 0) + COALESCE(delta, 0));
    UPDATE public.live_stats SET viewers = new_count, updated_at = now() WHERE stream_id = stream_id;
    RETURN new_count;
  END LOOP;
END;
$$;

-- Note: For security, add appropriate RLS policies or GRANT EXECUTE to the anon role if you want the client to call this via anon key.
