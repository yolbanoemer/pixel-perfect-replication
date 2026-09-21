CREATE OR REPLACE FUNCTION public.admin_update_investment_dates(
  _investment_id UUID,
  _started_at TIMESTAMPTZ,
  _matures_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.investments%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF _started_at < TIMESTAMPTZ '1999-01-01 00:00:00+00' OR _started_at > now() THEN
    RAISE EXCEPTION 'Start date must be between 1999 and today';
  END IF;
  IF _matures_at <= _started_at OR _matures_at > now() THEN
    RAISE EXCEPTION 'Unlock date must follow the start date and cannot be in the future';
  END IF;

  SELECT * INTO inv FROM public.investments WHERE id = _investment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Investment not found';
  END IF;

  UPDATE public.investments
  SET started_at = _started_at,
      matures_at = _matures_at,
      created_at = _started_at,
      lock_days = GREATEST(1, CEIL(EXTRACT(EPOCH FROM (_matures_at - _started_at)) / 86400.0)::INTEGER),
      status = 'matured'::public.investment_status
  WHERE id = _investment_id;

  UPDATE public.wallet_transactions
  SET created_at = CASE
    WHEN type = 'investment' THEN _started_at
    WHEN type IN ('payout', 'roi', 'fee') THEN _matures_at
    ELSE created_at
  END
  WHERE reference = _investment_id::text
    AND type IN ('investment', 'payout', 'roi', 'fee');
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_investment_dates(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_investment_dates(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;