
-- accrued roi helper
CREATE OR REPLACE FUNCTION public.accrued_roi(_amount NUMERIC, _daily_rate NUMERIC, _started TIMESTAMPTZ, _matures TIMESTAMPTZ)
RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$
  SELECT round(_amount * (_daily_rate/100.0) * (EXTRACT(EPOCH FROM (LEAST(now(), _matures) - _started)) / 86400.0), 2);
$$;
REVOKE ALL ON FUNCTION public.accrued_roi(NUMERIC,NUMERIC,TIMESTAMPTZ,TIMESTAMPTZ) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.accrued_roi(NUMERIC,NUMERIC,TIMESTAMPTZ,TIMESTAMPTZ) TO authenticated;

-- demo top up
CREATE OR REPLACE FUNCTION public.demo_topup(_amount NUMERIC)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid(); live BOOLEAN; bal NUMERIC;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _amount <= 0 OR _amount > 100000 THEN RAISE EXCEPTION 'Amount must be between 1 and 100,000'; END IF;
  SELECT coalesce((value->>'live')::boolean, false) INTO live FROM public.platform_settings WHERE key='payments';
  IF live THEN RAISE EXCEPTION 'Practice funding is disabled because live payments are active'; END IF;
  UPDATE public.profiles SET wallet_balance = wallet_balance + _amount WHERE id = uid RETURNING wallet_balance INTO bal;
  INSERT INTO public.wallet_transactions (user_id, type, amount, note) VALUES (uid,'deposit',_amount,'Practice funding');
  RETURN bal;
END; $$;
REVOKE ALL ON FUNCTION public.demo_topup(NUMERIC) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.demo_topup(NUMERIC) TO authenticated;

-- place investment
CREATE OR REPLACE FUNCTION public.place_investment(_plan_id UUID, _amount NUMERIC, _asset TEXT DEFAULT 'USD')
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid(); p RECORD; bal NUMERIC; inv_id UUID;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO p FROM public.plans WHERE id = _plan_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan unavailable'; END IF;
  IF _amount < p.min_amount THEN RAISE EXCEPTION 'Minimum for this plan is %', p.min_amount; END IF;
  SELECT wallet_balance INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;
  IF bal < _amount THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
  UPDATE public.profiles SET wallet_balance = wallet_balance - _amount WHERE id = uid;
  INSERT INTO public.investments (user_id, plan_id, asset, amount_usd, daily_rate, lock_days, matures_at)
  VALUES (uid, p.id, coalesce(_asset,'USD'), _amount, p.daily_rate, p.lock_days, now() + (p.lock_days || ' days')::interval)
  RETURNING id INTO inv_id;
  INSERT INTO public.wallet_transactions (user_id, type, amount, note, reference)
  VALUES (uid,'investment',-_amount, p.name || ' · ' || coalesce(_asset,'USD'), inv_id::text);
  RETURN inv_id;
END; $$;
REVOKE ALL ON FUNCTION public.place_investment(UUID,NUMERIC,TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.place_investment(UUID,NUMERIC,TEXT) TO authenticated;

-- settle matured
CREATE OR REPLACE FUNCTION public.settle_matured()
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid(); r RECORD; total NUMERIC := 0; roi NUMERIC; fee_pct NUMERIC; fee NUMERIC;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT coalesce((value->>'platform_fee_percent')::numeric,0) INTO fee_pct FROM public.platform_settings WHERE key='platform';
  FOR r IN SELECT * FROM public.investments WHERE user_id = uid AND payout_credited = false AND status IN ('active','matured') AND matures_at <= now() LOOP
    roi := public.accrued_roi(r.amount_usd, r.daily_rate, r.started_at, r.matures_at);
    fee := round(roi * coalesce(fee_pct,0)/100.0, 2);
    UPDATE public.investments SET status='matured', payout_credited=true WHERE id = r.id;
    UPDATE public.profiles SET wallet_balance = wallet_balance + r.amount_usd + roi - fee WHERE id = uid;
    INSERT INTO public.wallet_transactions (user_id, type, amount, note, reference) VALUES (uid,'payout', r.amount_usd, 'Capital returned', r.id::text);
    INSERT INTO public.wallet_transactions (user_id, type, amount, note, reference) VALUES (uid,'roi', roi, 'ROI earned', r.id::text);
    IF fee > 0 THEN
      INSERT INTO public.wallet_transactions (user_id, type, amount, note, reference) VALUES (uid,'fee', -fee, 'Platform fee', r.id::text);
    END IF;
    total := total + r.amount_usd + roi - fee;
  END LOOP;
  RETURN total;
END; $$;
REVOKE ALL ON FUNCTION public.settle_matured() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.settle_matured() TO authenticated;

-- p2p transfer
CREATE OR REPLACE FUNCTION public.send_transfer(_username TEXT, _amount NUMERIC, _note TEXT DEFAULT NULL)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid(); target UUID; bal NUMERIC;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than zero'; END IF;
  SELECT id INTO target FROM public.profiles WHERE lower(username) = lower(trim(_username));
  IF target IS NULL THEN RAISE EXCEPTION 'No member with that username'; END IF;
  IF target = uid THEN RAISE EXCEPTION 'You cannot send money to yourself'; END IF;
  SELECT wallet_balance INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;
  IF bal < _amount THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
  UPDATE public.profiles SET wallet_balance = wallet_balance - _amount WHERE id = uid;
  UPDATE public.profiles SET wallet_balance = wallet_balance + _amount WHERE id = target;
  INSERT INTO public.wallet_transactions (user_id, counterparty_id, type, amount, note) VALUES (uid, target,'transfer_out', -_amount, _note);
  INSERT INTO public.wallet_transactions (user_id, counterparty_id, type, amount, note) VALUES (target, uid,'transfer_in', _amount, _note);
  RETURN bal - _amount;
END; $$;
REVOKE ALL ON FUNCTION public.send_transfer(TEXT,NUMERIC,TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.send_transfer(TEXT,NUMERIC,TEXT) TO authenticated;

-- withdrawal request
CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount NUMERIC, _method TEXT, _destination TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid(); bal NUMERIC; min_w NUMERIC; wid UUID;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT coalesce((value->>'min_withdrawal')::numeric,0) INTO min_w FROM public.platform_settings WHERE key='platform';
  IF _amount < coalesce(min_w,0) THEN RAISE EXCEPTION 'Minimum withdrawal is %', min_w; END IF;
  SELECT wallet_balance INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;
  IF bal < _amount THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
  UPDATE public.profiles SET wallet_balance = wallet_balance - _amount WHERE id = uid;
  INSERT INTO public.withdrawals (user_id, amount, method, destination) VALUES (uid,_amount,_method,_destination) RETURNING id INTO wid;
  INSERT INTO public.wallet_transactions (user_id, type, amount, status, note, reference)
  VALUES (uid,'withdrawal', -_amount, 'pending', _method || ' → ' || _destination, wid::text);
  RETURN wid;
END; $$;
REVOKE ALL ON FUNCTION public.request_withdrawal(NUMERIC,TEXT,TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(NUMERIC,TEXT,TEXT) TO authenticated;

-- staff resolve withdrawal
CREATE OR REPLACE FUNCTION public.resolve_withdrawal(_id UUID, _status public.withdrawal_status, _note TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w RECORD;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO w FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF w.status <> 'pending' THEN RAISE EXCEPTION 'Request already resolved'; END IF;
  UPDATE public.withdrawals SET status = _status, admin_note = _note WHERE id = _id;
  IF _status = 'rejected' THEN
    UPDATE public.profiles SET wallet_balance = wallet_balance + w.amount WHERE id = w.user_id;
    UPDATE public.wallet_transactions SET status='failed', note = coalesce(note,'') || ' · refunded' WHERE reference = _id::text AND type='withdrawal';
  ELSIF _status IN ('approved','paid') THEN
    UPDATE public.wallet_transactions SET status='completed' WHERE reference = _id::text AND type='withdrawal';
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.resolve_withdrawal(UUID, public.withdrawal_status, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.resolve_withdrawal(UUID, public.withdrawal_status, TEXT) TO authenticated;

-- admin: set a member's role
CREATE OR REPLACE FUNCTION public.set_user_role(_user_id UUID, _role public.app_role)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role);
END; $$;
REVOKE ALL ON FUNCTION public.set_user_role(UUID, public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(UUID, public.app_role) TO authenticated;

-- admin: credit or debit a member's wallet
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(_user_id UUID, _amount NUMERIC, _note TEXT)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bal NUMERIC;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  UPDATE public.profiles SET wallet_balance = wallet_balance + _amount WHERE id = _user_id RETURNING wallet_balance INTO bal;
  IF bal IS NULL THEN RAISE EXCEPTION 'Member not found'; END IF;
  INSERT INTO public.wallet_transactions (user_id, type, amount, note)
  VALUES (_user_id, CASE WHEN _amount >= 0 THEN 'deposit'::public.tx_type ELSE 'fee'::public.tx_type END, _amount, coalesce(_note,'Adjustment by admin'));
  RETURN bal;
END; $$;
REVOKE ALL ON FUNCTION public.admin_adjust_balance(UUID,NUMERIC,TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_balance(UUID,NUMERIC,TEXT) TO authenticated;
