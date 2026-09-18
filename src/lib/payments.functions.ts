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

export type BillingPlan = {
  id: string;
  slug: string;
  name: string;
  description: string;
  monthly_price_cents: number;
  currency: string;
  features: string[];
  limits: Record<string, string | number | boolean | null>;
  sort_order: number;
};

export type BillingInvoice = {
  id: string;
  number: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  hosted_invoice_url: string | null;
};

export type BillingUsage = {
  messages_used: number;
  projects_used: number;
  members_used: number;
  limits: Record<string, string | number | boolean | null>;
  period_start: string | null;
  period_end: string | null;
};

export type BillingOverview = {
  workspace_id: string;
  workspace_name: string;
  plans: BillingPlan[];
  subscription: {
    id: string | null;
    plan_slug: string;
    plan_name: string;
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    provider: string | null;
  };
  usage: BillingUsage;
  invoices: BillingInvoice[];
  checkout_configured: boolean;
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

type RawPlanRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  monthly_price_cents: number | null;
  currency: string | null;
  features_json: unknown;
  limits_json: unknown;
  sort_order: number | null;
};

type RawSubscriptionRow = {
  id: string;
  plan_id: string | null;
  status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  provider: string | null;
};

type RawInvoiceRow = {
  id: string;
  number: string | null;
  amount_cents: number | null;
  currency: string | null;
  status: string | null;
  created_at: string;
  hosted_invoice_url: string | null;
};

type RawUsageRow = {
  messages_used: number | null;
  projects_used: number | null;
  members_used: number | null;
  period_start: string | null;
  period_end: string | null;
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

const planSlugSchema = z
  .string()
  .trim()
  .min(1, "Select a plan")
  .max(48, "Plan slug is too long");

const checkoutSchema = z.object({
  planSlug: planSlugSchema,
  workspaceId: z.string().uuid().optional(),
});

const billingOverviewSchema = z.object({
  workspaceId: z.string().uuid().optional(),
});

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  return [];
}

function toRecord(
  value: unknown,
): Record<string, string | number | boolean | null> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, string | number | boolean | null>;
  }
  return {};
}

/**
 * Reads the workspace the signed-in user belongs to. Falls back to the
 * personal workspace created by `ensureWorkspace` when no id is supplied.
 */
async function resolveWorkspaceId(
  supabase: SupabaseClient<any>,
  userId: string,
  requestedId?: string,
): Promise<string> {
  if (requestedId) return requestedId;

  const { data: owned, error: ownedError } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ownedError) throw new Error(ownedError.message);
  if (owned?.id) return owned.id as string;

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) throw new Error(membershipError.message);
  if (membership?.workspace_id) return membership.workspace_id as string;

  throw new Error("No workspace found for this account");
}

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

/**
 * Workspace-scoped billing overview: available plans, the active subscription,
 * metered usage for the current period and the invoice history.
 *
 * When no payment provider keys are configured the subscription status is
 * reported as `not_configured` and `checkout_configured` is false, so the UI
 * can show an honest "billing not configured" state instead of a dead button.
 */
export const getBillingOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => billingOverviewSchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<BillingOverview> => {
    const { supabase: typedSupabase, userId } = context;
    const supabase = typedSupabase as SupabaseClient<any>;

    const workspaceId = await resolveWorkspaceId(supabase, userId, data.workspaceId);

    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("id, name, plan_id")
      .eq("id", workspaceId)
      .maybeSingle();

    if (workspaceError) throw new Error(workspaceError.message);
    if (!workspace) throw new Error("Workspace not found");

    const [plansResult, subscriptionResult, invoicesResult, usageResult] =
      await Promise.all([
        supabase
          .from("plans")
          .select(
            "id, slug, name, description, monthly_price_cents, currency, features_json, limits_json, sort_order",
          )
          .order("sort_order", { ascending: true })
          .returns<RawPlanRow[]>(),
        supabase
          .from("subscriptions")
          .select(
            "id, plan_id, status, current_period_end, cancel_at_period_end, provider",
          )
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<RawSubscriptionRow>(),
        supabase
          .from("invoices")
          .select(
            "id, number, amount_cents, currency, status, created_at, hosted_invoice_url",
          )
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false })
          .limit(24)
          .returns<RawInvoiceRow[]>(),
        supabase
          .from("workspace_usage")
          .select(
            "messages_used, projects_used, members_used, period_start, period_end",
          )
          .eq("workspace_id", workspaceId)
          .order("period_start", { ascending: false })
          .limit(1)
          .maybeSingle<RawUsageRow>(),
      ]);

    if (plansResult.error) throw new Error(plansResult.error.message);
    if (subscriptionResult.error) throw new Error(subscriptionResult.error.message);
    if (invoicesResult.error) throw new Error(invoicesResult.error.message);
    if (usageResult.error) throw new Error(usageResult.error.message);

    const plans: BillingPlan[] = (plansResult.data ?? []).map((row: RawPlanRow) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description ?? "",
      monthly_price_cents: row.monthly_price_cents ?? 0,
      currency: row.currency ?? "usd",
      features: toStringArray(row.features_json),
      limits: toRecord(row.limits_json),
      sort_order: row.sort_order ?? 0,
    }));

    const subscriptionRow = subscriptionResult.data ?? null;
    const activePlan =
      plans.find((plan) => plan.id === subscriptionRow?.plan_id) ??
      plans.find((plan) => plan.id === workspace.plan_id) ??
      plans.find((plan) => plan.slug === "free") ??
      null;

    const usageRow = usageResult.data ?? null;

    const { data: checkoutConfigured, error: configError } = await supabase.rpc(
      "billing_checkout_configured",
    );

    if (configError) {
      // The helper is optional: absence of the RPC means no provider is wired.
      // Report the honest not-configured state rather than failing the page.
      return {
        workspace_id: workspaceId,
        workspace_name: workspace.name as string,
        plans,
        subscription: {
          id: subscriptionRow?.id ?? null,
          plan_slug: activePlan?.slug ?? "free",
          plan_name: activePlan?.name ?? "Free",
          status: subscriptionRow?.status ?? "not_configured",
          current_period_end: subscriptionRow?.current_period_end ?? null,
          cancel_at_period_end: subscriptionRow?.cancel_at_period_end ?? false,
          provider: subscriptionRow?.provider ?? null,
        },
        usage: {
          messages_used: usageRow?.messages_used ?? 0,
          projects_used: usageRow?.projects_used ?? 0,
          members_used: usageRow?.members_used ?? 0,
          limits: activePlan?.limits ?? {},
          period_start: usageRow?.period_start ?? null,
          period_end: usageRow?.period_end ?? null,
        },
        invoices: (invoicesResult.data ?? []).map((row: RawInvoiceRow) => ({
          id: row.id,
          number: row.number,
          amount_cents: row.amount_cents ?? 0,
          currency: row.currency ?? "usd",
          status: row.status ?? "open",
          created_at: row.created_at,
          hosted_invoice_url: row.hosted_invoice_url,
        })),
        checkout_configured: false,
      };
    }

    return {
      workspace_id: workspaceId,
      workspace_name: workspace.name as string,
      plans,
      subscription: {
        id: subscriptionRow?.id ?? null,
        plan_slug: activePlan?.slug ?? "free",
        plan_name: activePlan?.name ?? "Free",
        status: subscriptionRow?.status ?? "not_configured",
        current_period_end: subscriptionRow?.current_period_end ?? null,
        cancel_at_period_end: subscriptionRow?.cancel_at_period_end ?? false,
        provider: subscriptionRow?.provider ?? null,
      },
      usage: {
        messages_used: usageRow?.messages_used ?? 0,
        projects_used: usageRow?.projects_used ?? 0,
        members_used: usageRow?.members_used ?? 0,
        limits: activePlan?.limits ?? {},
        period_start: usageRow?.period_start ?? null,
        period_end: usageRow?.period_end ?? null,
      },
      invoices: (invoicesResult.data ?? []).map((row: RawInvoiceRow) => ({
        id: row.id,
        number: row.number,
        amount_cents: row.amount_cents ?? 0,
        currency: row.currency ?? "usd",
        status: row.status ?? "open",
        created_at: row.created_at,
        hosted_invoice_url: row.hosted_invoice_url,
      })),
      checkout_configured: Boolean(checkoutConfigured),
    };
  });

/**
 * Starts a Stripe Checkout session for a workspace plan change.
 *
 * The live Stripe secret is never shipped to the client. When the deployment
 * has no provider keys the function returns `configured: false` and the UI
 * shows the honest "billing not configured" state instead of a dead button.
 */
export const startCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => checkoutSchema.parse(input))
  .handler(
    async ({
      data,
      context,
    }): Promise<
      | { configured: false; message: string }
      | { configured: true; url: string; sessionId: string }
    > => {
      const { supabase: typedSupabase, userId } = context;
      const supabase = typedSupabase as SupabaseClient<any>;

      const workspaceId = await resolveWorkspaceId(supabase, userId, data.workspaceId);

      const { data: plan, error: planError } = await supabase
        .from("plans")
        .select("id, slug, name, monthly_price_cents, currency")
        .eq("slug", data.planSlug)
        .maybeSingle();

      if (planError) throw new Error(planError.message);
      if (!plan) throw new Error("Unknown plan");

      const { data: configured, error: configError } = await supabase.rpc(
        "billing_checkout_configured",
      );

      if (configError || !configured) {
        return {
          configured: false,
          message:
            "Billing is not configured for this deployment. Add your payment provider keys to enable checkout.",
        };
      }

      const { data: session, error: sessionError } = await supabase.rpc(
        "create_checkout_session",
        {
          p_workspace_id: workspaceId,
          p_plan_slug: data.planSlug,
        },
      );

      if (sessionError) throw new Error(sessionError.message);

      const url =
        session && typeof session === "object" && "url" in session
          ? String((session as { url: unknown }).url)
          : null;
      const sessionId =
        session && typeof session === "object" && "id" in session
          ? String((session as { id: unknown }).id)
          : null;

      if (!url || !sessionId) {
        throw new Error("The payment provider did not return a checkout URL");
      }

      return { configured: true, url, sessionId };
    },
  );
