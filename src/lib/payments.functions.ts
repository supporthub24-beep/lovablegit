import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const CREDIT_PACKS = [
  {
    id: "starter",
    name: "Starter pack",
    credits: 100,
    amountCents: 500,
    currency: "usd",
    description: "100 credits for trying chat and image generation.",
  },
  {
    id: "creator",
    name: "Creator pack",
    credits: 500,
    amountCents: 2000,
    currency: "usd",
    description: "500 credits — best value for regular chat and image work.",
  },
  {
    id: "studio",
    name: "Studio pack",
    credits: 1500,
    amountCents: 5000,
    currency: "usd",
    description: "1500 credits for teams generating images and copy daily.",
  },
] as const;

export type CreditPack = (typeof CREDIT_PACKS)[number];

export const CREDIT_COSTS = {
  chat: 1,
  image: 5,
} as const;

export type CreditWallet = {
  balance: number;
  lifetimePurchased: number;
  lifetimeSpent: number;
};

export type CreditLedgerEntry = {
  id: string;
  delta: number;
  reason: string;
  balanceAfter: number;
  createdAt: string;
};

export type CreditPurchase = {
  id: string;
  packId: string;
  credits: number;
  amountCents: number;
  currency: string;
  status: string;
  provider: string;
  createdAt: string;
};

type RawWalletRow = {
  balance: number | null;
  lifetime_purchased: number | null;
  lifetime_spent: number | null;
};

type RawLedgerRow = {
  id: string;
  delta: number;
  reason: string;
  balance_after: number;
  created_at: string;
};

type RawPurchaseRow = {
  id: string;
  pack_id: string;
  credits: number;
  amount_cents: number;
  currency: string;
  status: string;
  provider: string;
  created_at: string;
};

const packIdSchema = z
  .string()
  .trim()
  .min(1, "Select a credit pack")
  .refine(
    (value) => CREDIT_PACKS.some((pack) => pack.id === value),
    "Unknown credit pack",
  );

const spendSchema = z.object({
  amount: z.number().int().positive().max(10_000),
  reason: z.string().trim().min(1).max(120),
});

export const getCreditOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
  async ({ context }): Promise<{
    wallet: CreditWallet;
    ledger: CreditLedgerEntry[];
    purchases: CreditPurchase[];
  }> => {
    const { supabase: typedSupabase, userId } = context;
    const supabase = typedSupabase as SupabaseClient<any>;

    const [walletResult, ledgerResult, purchasesResult] = await Promise.all([
      supabase
        .from("credit_wallets")
        .select("balance, lifetime_purchased, lifetime_spent")
        .eq("user_id", userId)
        .maybeSingle<RawWalletRow>(),
      supabase
        .from("credit_ledger")
        .select("id, delta, reason, balance_after, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(25)
        .returns<RawLedgerRow[]>(),
      supabase
        .from("credit_purchases")
        .select(
          "id, pack_id, credits, amount_cents, currency, status, provider, created_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(25)
        .returns<RawPurchaseRow[]>(),
    ]);

    if (walletResult.error) {
      throw new Error(walletResult.error.message);
    }
    if (ledgerResult.error) {
      throw new Error(ledgerResult.error.message);
    }
    if (purchasesResult.error) {
      throw new Error(purchasesResult.error.message);
    }

    return {
      wallet: {
        balance: walletResult.data?.balance ?? 0,
        lifetimePurchased: walletResult.data?.lifetime_purchased ?? 0,
        lifetimeSpent: walletResult.data?.lifetime_spent ?? 0,
      },
      ledger: (ledgerResult.data ?? []).map((row: RawLedgerRow) => ({
        id: row.id,
        delta: row.delta,
        reason: row.reason,
        balanceAfter: row.balance_after,
        createdAt: row.created_at,
      })),
      purchases: (purchasesResult.data ?? []).map((row: RawPurchaseRow) => ({
        id: row.id,
        packId: row.pack_id,
        credits: row.credits,
        amountCents: row.amount_cents,
        currency: row.currency,
        status: row.status,
        provider: row.provider,
        createdAt: row.created_at,
      })),
    };
  },
);

export const purchaseCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ packId: packIdSchema }).parse(data))
  .handler(async ({ data, context }): Promise<{ purchase: CreditPurchase; balance: number }> => {
    const pack = CREDIT_PACKS.find((entry) => entry.id === data.packId);

    if (!pack) {
      throw new Error("Unknown credit pack");
    }

    const supabase = context.supabase as SupabaseClient<any>;

    const { data: purchase, error } = await supabase
      .rpc("grant_credit_purchase", {
        p_pack_id: pack.id,
        p_credits: pack.credits,
        p_amount_cents: pack.amountCents,
        p_currency: pack.currency,
      })
      .single<RawPurchaseRow>();

    if (error || !purchase) {
      throw new Error(error?.message ?? "Could not complete the credit purchase");
    }

    const { data: balance, error: balanceError } = await supabase.rpc(
      "current_credit_balance",
    );

    if (balanceError) {
      throw new Error(balanceError.message);
    }

    return {
      purchase: {
        id: purchase.id,
        packId: purchase.pack_id,
        credits: purchase.credits,
        amountCents: purchase.amount_cents,
        currency: purchase.currency,
        status: purchase.status,
        provider: purchase.provider,
        createdAt: purchase.created_at,
      },
      balance: typeof balance === "number" ? balance : 0,
    };
  });

export const spendCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => spendSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ balance: number }> => {
    const supabase = context.supabase as SupabaseClient<any>;

    const { data: balance, error } = await supabase.rpc("spend_credits", {
      p_amount: data.amount,
      p_reason: data.reason,
    });

    if (error) {
      if (error.message.includes("insufficient_credits")) {
        throw new Error("Not enough credits for this action. Top up to continue.");
      }
      throw new Error(error.message);
    }

    return { balance: typeof balance === "number" ? balance : 0 };
  });
