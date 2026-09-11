-- Credits, credit ledger, and credit purchases.
-- Credit balance is always derived from the ledger and scoped to auth.uid().

CREATE TABLE public.credit_wallets (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_purchased integer NOT NULL DEFAULT 0 CHECK (lifetime_purchased >= 0),
  lifetime_spent integer NOT NULL DEFAULT 0 CHECK (lifetime_spent >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_wallets TO authenticated;
GRANT ALL ON public.credit_wallets TO service_role;

ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit wallet"
  ON public.credit_wallets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credit wallet"
  ON public.credit_wallets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit wallet"
  ON public.credit_wallets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pack_id text NOT NULL,
  credits integer NOT NULL CHECK (credits > 0),
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  provider text NOT NULL DEFAULT 'manual',
  provider_reference text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_purchases TO authenticated;
GRANT ALL ON public.credit_purchases TO service_role;

ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit purchases"
  ON public.credit_purchases
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credit purchases"
  ON public.credit_purchases
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit purchases"
  ON public.credit_purchases
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  purchase_id uuid REFERENCES public.credit_purchases(id) ON DELETE SET NULL,
  delta integer NOT NULL CHECK (delta <> 0),
  reason text NOT NULL,
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.credit_ledger TO authenticated;
GRANT ALL ON public.credit_ledger TO service_role;

ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit ledger"
  ON public.credit_ledger
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX credit_purchases_user_id_created_at_idx
  ON public.credit_purchases (user_id, created_at DESC);

CREATE INDEX credit_ledger_user_id_created_at_idx
  ON public.credit_ledger (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER credit_wallets_set_updated_at
  BEFORE UPDATE ON public.credit_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER credit_purchases_set_updated_at
  BEFORE UPDATE ON public.credit_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.current_credit_balance()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT balance FROM public.credit_wallets WHERE user_id = auth.uid()),
    0
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_credit_balance() TO authenticated;

CREATE OR REPLACE FUNCTION public.grant_credit_purchase(
  p_pack_id text,
  p_credits integer,
  p_amount_cents integer,
  p_currency text DEFAULT 'usd'
)
RETURNS public.credit_purchases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_purchase public.credit_purchases;
  v_balance integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_credits IS NULL OR p_credits <= 0 THEN
    RAISE EXCEPTION 'invalid_credit_amount' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.credit_wallets (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.credit_purchases (
    user_id, pack_id, credits, amount_cents, currency, status, provider
  )
  VALUES (
    v_user_id, p_pack_id, p_credits, GREATEST(p_amount_cents, 0),
    COALESCE(p_currency, 'usd'), 'paid', 'manual'
  )
  RETURNING * INTO v_purchase;

  UPDATE public.credit_wallets
  SET balance = balance + p_credits,
      lifetime_purchased = lifetime_purchased + p_credits
  WHERE user_id = v_user_id
  RETURNING balance INTO v_balance;

  INSERT INTO public.credit_ledger (
    user_id, purchase_id, delta, reason, balance_after
  )
  VALUES (
    v_user_id, v_purchase.id, p_credits, 'credit_purchase', v_balance
  );

  RETURN v_purchase;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_credit_purchase(text, integer, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.spend_credits(
  p_amount integer,
  p_reason text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_credit_amount' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.credit_wallets (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.credit_wallets
  SET balance = balance - p_amount,
      lifetime_spent = lifetime_spent + p_amount
  WHERE user_id = v_user_id
    AND balance >= p_amount
  RETURNING balance INTO v_balance;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'insufficient_credits' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.credit_ledger (
    user_id, delta, reason, balance_after, metadata
  )
  VALUES (
    v_user_id, -p_amount, COALESCE(NULLIF(p_reason, ''), 'usage'),
    v_balance, COALESCE(p_metadata, '{}'::jsonb)
  );

  RETURN v_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.spend_credits(integer, text, jsonb) TO authenticated;
