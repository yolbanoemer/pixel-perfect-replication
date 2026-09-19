CREATE TYPE public.deposit_method AS ENUM ('bank','paypal','crypto');
CREATE TYPE public.deposit_status AS ENUM ('pending','confirmed','rejected');

CREATE TABLE public.deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method public.deposit_method NOT NULL,
  asset text NOT NULL DEFAULT 'USD',
  amount numeric NOT NULL,
  country text,
  destination text,
  reference text,
  status public.deposit_status NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.deposits TO authenticated;
GRANT UPDATE ON public.deposits TO authenticated;
GRANT ALL ON public.deposits TO service_role;

ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own deposits read" ON public.deposits FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own deposits insert" ON public.deposits FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "staff update deposits" ON public.deposits FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER update_deposits_updated_at BEFORE UPDATE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.request_deposit(
  _method public.deposit_method,
  _amount numeric,
  _asset text DEFAULT 'USD',
  _country text DEFAULT NULL,
  _destination text DEFAULT NULL,
  _reference text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Enter an amount greater than zero'; END IF;
  IF _method = 'bank' THEN RAISE EXCEPTION 'Bank deposits are not available at the moment'; END IF;
  INSERT INTO public.deposits (user_id, method, amount, asset, country, destination, reference)
  VALUES (auth.uid(), _method, _amount, COALESCE(_asset,'USD'), _country, _destination, _reference)
  RETURNING id INTO _id;
  RETURN _id;
END; $$;

REVOKE ALL ON FUNCTION public.request_deposit(public.deposit_method, numeric, text, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.request_deposit(public.deposit_method, numeric, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.resolve_deposit(_id uuid, _status public.deposit_status, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.deposits%ROWTYPE;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Staff only'; END IF;
  SELECT * INTO d FROM public.deposits WHERE id = _id FOR UPDATE;
  IF d.id IS NULL THEN RAISE EXCEPTION 'Deposit not found'; END IF;
  IF d.status <> 'pending' THEN RAISE EXCEPTION 'This deposit was already resolved'; END IF;

  UPDATE public.deposits SET status = _status, admin_note = _note, updated_at = now() WHERE id = _id;

  IF _status = 'confirmed' THEN
    UPDATE public.profiles SET wallet_balance = wallet_balance + d.amount, updated_at = now()
    WHERE id = d.user_id;
    INSERT INTO public.wallet_transactions (user_id, type, amount, status, note, reference)
    VALUES (d.user_id, 'deposit', d.amount, 'completed',
            'Deposit via ' || d.method::text || COALESCE(' (' || d.asset || ')',''), d.reference);
  END IF;
END; $$;

REVOKE ALL ON FUNCTION public.resolve_deposit(uuid, public.deposit_status, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.resolve_deposit(uuid, public.deposit_status, text) TO authenticated;