
CREATE OR REPLACE FUNCTION public.accrued_roi(_amount NUMERIC, _daily_rate NUMERIC, _started TIMESTAMPTZ, _matures TIMESTAMPTZ)
RETURNS NUMERIC LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT round(_amount * (_daily_rate/100.0) * (EXTRACT(EPOCH FROM (LEAST(now(), _matures) - _started)) / 86400.0), 2);
$$;
