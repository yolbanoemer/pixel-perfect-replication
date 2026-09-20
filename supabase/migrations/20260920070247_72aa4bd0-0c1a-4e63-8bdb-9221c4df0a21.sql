CREATE OR REPLACE FUNCTION public.admin_award_historical_investment(
  _user_id UUID,
  _plan_id UUID,
  _amount NUMERIC,
  _asset TEXT,
  _started_at TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.plans%ROWTYPE;
  inv_id UUID;
  maturity TIMESTAMPTZ;
  roi NUMERIC;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    RAISE EXCEPTION 'Member not found';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;
  IF _started_at < TIMESTAMPTZ '1999-01-01 00:00:00+00' OR _started_at > now() THEN
    RAISE EXCEPTION 'Start date must be between 1999 and today';
  END IF;

  SELECT * INTO p FROM public.plans WHERE id = _plan_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found';
  END IF;

  maturity := _started_at + make_interval(days => p.lock_days);
  IF maturity > now() THEN
    RAISE EXCEPTION 'Choose a date old enough for this plan to have completed';
  END IF;
  roi := round(_amount * (p.daily_rate / 100.0) * p.lock_days, 2);

  INSERT INTO public.investments (
    user_id, plan_id, asset, amount_usd, daily_rate, lock_days,
    status, payout_credited, started_at, matures_at, created_at, updated_at
  ) VALUES (
    _user_id, p.id, COALESCE(NULLIF(trim(_asset), ''), 'USD'), _amount,
    p.daily_rate, p.lock_days, 'matured', true,
    _started_at, maturity, _started_at, maturity
  ) RETURNING id INTO inv_id;

  INSERT INTO public.wallet_transactions (user_id, type, amount, status, note, reference, created_at)
  VALUES
    (_user_id, 'investment', -_amount, 'completed', p.name || ' · ' || COALESCE(NULLIF(trim(_asset), ''), 'USD'), inv_id::text, _started_at),
    (_user_id, 'payout', _amount, 'completed', 'Capital returned', inv_id::text, maturity),
    (_user_id, 'roi', roi, 'completed', 'ROI earned', inv_id::text, maturity + interval '1 second');

  RETURN inv_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_award_historical_investment(UUID, UUID, NUMERIC, TEXT, TIMESTAMPTZ) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_award_historical_investment(UUID, UUID, NUMERIC, TEXT, TIMESTAMPTZ) TO authenticated;

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
  IF _matures_at <= _started_at THEN
    RAISE EXCEPTION 'Unlock date must follow the start date';
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
      status = CASE
        WHEN payout_credited THEN 'matured'::public.investment_status
        WHEN _matures_at <= now() THEN 'matured'::public.investment_status
        ELSE 'active'::public.investment_status
      END
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