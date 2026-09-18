import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Coins,
  CreditCard,
  Gauge,
  Loader2,
  Receipt,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CREDIT_COSTS,
  CREDIT_PACKS,
  getCreditOverview,
  purchaseCredits,
} from "@/lib/payments.functions";
import {
  getBillingOverview,
  startCheckout,
  type BillingOverview,
  type BillingPlan,
} from "@/lib/payments.functions";
import { getWorkspaceOverview } from "@/lib/workspaces.functions";

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({
    meta: [
      { title: "Credits & payments" },
      {
        name: "description",
        content:
          "Top up credits for AI chat and image generation, and review your credit balance and purchase history.",
      },
    ],
  }),
  component: PaymentsPage,
});

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatAmount(amountCents: number, currency: string) {
  if (currency.toLowerCase() === "usd") {
    return currencyFormatter.format(amountCents / 100);
  }
  return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "paid" || status === "active") return "default";
  if (status === "failed" || status === "past_due") return "destructive";
  return "secondary";
}

function formatPlanPrice(plan: BillingPlan) {
  if (plan.monthly_price_cents === 0) return "Free";
  return `${formatAmount(plan.monthly_price_cents, plan.currency)}/mo`;
}

function limitValue(limits: Record<string, unknown>, key: string): number | null {
  const raw = limits[key];
  if (typeof raw === "number") return raw;
  if (typeof raw === "string" && raw.trim() !== "" && !Number.isNaN(Number(raw))) {
    return Number(raw);
  }
  return null;
}

function UsageMeter({
  label,
  used,
  limit,
  hint,
}: {
  label: string;
  used: number;
  limit: number | null;
  hint: string;
}) {
  const unlimited = limit === null || limit <= 0;
  const percent = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs tabular-nums">
          {unlimited ? `${used} used · unlimited` : `${used} / ${limit} used`}
        </p>
      </div>
      <Progress value={unlimited ? 0 : percent} aria-label={`${label} usage`} />
      <p className="text-muted-foreground text-xs">{hint}</p>
    </div>
  );
}

function BillingSection({
  billing,
  workspaceName,
  onCheckout,
  checkoutPendingPlan,
  checkoutConfigured,
}: {
  billing: BillingOverview | undefined;
  workspaceName: string | undefined;
  onCheckout: (planSlug: string) => void;
  checkoutPendingPlan: string | null;
  checkoutConfigured: boolean;
}) {
  const plans = billing?.plans ?? [];
  const currentSlug = billing?.subscription.plan_slug ?? "free";
  const limits = billing?.usage.limits ?? {};
  const usage = billing?.usage;

  return (
    <section aria-labelledby="billing-heading" className="space-y-4">
      <div className="space-y-1">
        <h2 id="billing-heading" className="text-xl font-semibold tracking-tight">
          Workspace plan
        </h2>
        <p className="text-muted-foreground text-sm">
          Plans, usage limits and invoices are scoped to{" "}
          <span className="text-foreground font-medium">
            {workspaceName ?? "your workspace"}
          </span>
          . Upgrades apply to every member of the workspace.
        </p>
      </div>

      {!checkoutConfigured && (
        <div className="border-highlight/40 bg-highlight/10 text-highlight-foreground flex items-start gap-3 rounded-lg border px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">Billing not configured</p>
            <p className="mt-0.5 text-xs">
              No payment provider keys are set for this deployment, so checkout is
              disabled. Plan changes below are recorded against the workspace and
              take effect immediately.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.slug === currentSlug;
          const isPending = checkoutPendingPlan === plan.slug;
          return (
            <Card
              key={plan.id}
              className={
                isCurrent
                  ? "border-primary/60 ring-primary/20 flex flex-col ring-1"
                  : "flex flex-col"
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  {plan.name}
                  {isCurrent ? (
                    <Badge>Current</Badge>
                  ) : plan.slug === "pro" ? (
                    <Badge variant="secondary">Popular</Badge>
                  ) : null}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-4">
                <p className="text-2xl font-semibold tabular-nums">
                  {formatPlanPrice(plan)}
                </p>
                <ul className="space-y-1.5 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check
                        className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent || checkoutPendingPlan !== null}
                  onClick={() => onCheckout(plan.slug)}
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  {isCurrent
                    ? "Current plan"
                    : isPending
                      ? "Starting checkout…"
                      : `Switch to ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="h-4 w-4" aria-hidden="true" />
              Usage this period
            </CardTitle>
            <CardDescription>
              Metered per workspace against your current plan limits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {usage ? (
              <>
                <UsageMeter
                  label="AI messages"
                  used={usage.messages_used}
                  limit={limitValue(limits, "messages_per_month")}
                  hint="Every chat message sent from the workspace counts once."
                />
                <UsageMeter
                  label="Projects"
                  used={usage.projects_used}
                  limit={limitValue(limits, "projects")}
                  hint="Projects created inside this workspace."
                />
                <UsageMeter
                  label="Workspace members"
                  used={usage.members_used}
                  limit={limitValue(limits, "members")}
                  hint="Active members and pending invitations."
                />
              </>
            ) : (
              <div className="space-y-3">
                {[0, 1, 2].map((index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4" aria-hidden="true" />
              Invoice history
            </CardTitle>
            <CardDescription>
              Subscription invoices issued for this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!billing ? (
              <div className="space-y-3">
                {[0, 1, 2].map((index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : billing.invoices.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No invoices yet. Invoices appear here once a paid plan is active.
              </p>
            ) : (
              <ul className="divide-border divide-y">
                {billing.invoices.map((invoice) => (
                  <li
                    key={invoice.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {invoice.number ?? invoice.id.slice(0, 8)}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {dateFormatter.format(new Date(invoice.created_at))}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm tabular-nums">
                        {formatAmount(invoice.amount_cents, invoice.currency)}
                      </span>
                      <Badge variant={statusVariant(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function PaymentsPage() {
  const queryClient = useQueryClient();
  const [pendingPackId, setPendingPackId] = useState<string | null>(null);
  const [pendingPlanSlug, setPendingPlanSlug] = useState<string | null>(null);

  const fetchBilling = useServerFn(getBillingOverview);
  const fetchWorkspace = useServerFn(getWorkspaceOverview);
  const checkout = useServerFn(startCheckout);

  const overviewQuery = useQuery({
    queryKey: ["credit-overview"],
    queryFn: () => getCreditOverview(),
  });

  const billingQuery = useQuery({
    queryKey: ["billing-overview"],
    queryFn: () => fetchBilling(),
    retry: false,
  });

  const workspaceQuery = useQuery({
    queryKey: ["workspace-overview"],
    queryFn: () => fetchWorkspace(),
    retry: false,
  });

  const checkoutMutation = useMutation({
    mutationFn: (planSlug: string) => checkout({ data: { planSlug } }),
    onMutate: (planSlug: string) => {
      setPendingPlanSlug(planSlug);
    },
    onSuccess: (result) => {
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      toast.success(
        result.message ??
          `Workspace moved to the ${result.plan.name} plan.`,
      );
      void queryClient.invalidateQueries({ queryKey: ["billing-overview"] });
      void queryClient.invalidateQueries({ queryKey: ["workspace-overview"] });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not start the plan change.",
      );
    },
    onSettled: () => {
      setPendingPlanSlug(null);
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: (packId: string) => purchaseCredits({ data: { packId } }),
    onMutate: (packId: string) => {
      setPendingPackId(packId);
    },
    onSuccess: (result) => {
      toast.success(
        `Added ${result.purchase.credits} credits. New balance: ${result.balance}.`,
      );
      void queryClient.invalidateQueries({ queryKey: ["credit-overview"] });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not complete the credit purchase.",
      );
    },
    onSettled: () => {
      setPendingPackId(null);
    },
  });

  const wallet = overviewQuery.data?.wallet;
  const ledger = overviewQuery.data?.ledger ?? [];
  const purchases = overviewQuery.data?.purchases ?? [];

  const estimatedRuns = useMemo(() => {
    const balance = wallet?.balance ?? 0;
    return {
      chat: Math.floor(balance / CREDIT_COSTS.chat),
      images: Math.floor(balance / CREDIT_COSTS.image),
    };
  }, [wallet?.balance]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Credits &amp; payments</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Buy credit packs to run AI chat and image generation. Credit spending is
          only ever recorded against your own account, and every balance change is
          written to your private ledger.
        </p>
      </header>

      <BillingSection
        billing={billingQuery.data}
        workspaceName={workspaceQuery.data?.workspace.name}
        onCheckout={(planSlug) => checkoutMutation.mutate(planSlug)}
        checkoutPendingPlan={pendingPlanSlug}
        checkoutConfigured={billingQuery.data?.checkout_configured ?? false}
      />

      <Separator />

      <section aria-labelledby="wallet-heading" className="space-y-4">
        <h2 id="wallet-heading" className="sr-only">
          Credit balance
        </h2>

        {overviewQuery.isPending ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : overviewQuery.isError ? (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-base">Could not load your credits</CardTitle>
              <CardDescription>
                {overviewQuery.error instanceof Error
                  ? overviewQuery.error.message
                  : "Something went wrong while loading your credit wallet."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => void overviewQuery.refetch()}
                disabled={overviewQuery.isFetching}
              >
                {overviewQuery.isFetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current balance</CardTitle>
                <Wallet className="text-muted-foreground h-4 w-4" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">
                  {wallet?.balance ?? 0}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {estimatedRuns.chat} chats or {estimatedRuns.images} images remaining
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Credits purchased</CardTitle>
                <CreditCard className="text-muted-foreground h-4 w-4" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">
                  {wallet?.lifetimePurchased ?? 0}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Total credits added to your account
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Credits used</CardTitle>
                <Coins className="text-muted-foreground h-4 w-4" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">
                  {wallet?.lifetimeSpent ?? 0}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Chat costs {CREDIT_COSTS.chat} credit, image generation costs{" "}
                  {CREDIT_COSTS.image}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      <section aria-labelledby="packs-heading" className="space-y-4">
        <div className="space-y-1">
          <h2 id="packs-heading" className="text-xl font-semibold tracking-tight">
            Top up credits
          </h2>
          <p className="text-muted-foreground text-sm">
            Choose a pack to add credits instantly. Live card charging is handled by
            your payment provider once connected — today the pack is recorded
            against your account and credited right away.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {CREDIT_PACKS.map((pack) => {
            const isPending = pendingPackId === pack.id;
            return (
              <Card key={pack.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    {pack.name}
                    <Badge variant="secondary">{pack.credits} credits</Badge>
                  </CardTitle>
                  <CardDescription>{pack.description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto space-y-4">
                  <p className="text-2xl font-semibold tabular-nums">
                    {formatAmount(pack.amountCents, pack.currency)}
                  </p>
                  <Button
                    className="w-full"
                    disabled={purchaseMutation.isPending}
                    onClick={() => purchaseMutation.mutate(pack.id)}
                  >
                    {isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : null}
                    {isPending ? "Adding credits…" : "Buy credits"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="activity-heading" className="space-y-4">
        <h2 id="activity-heading" className="text-xl font-semibold tracking-tight">
          Activity
        </h2>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Credit ledger</CardTitle>
              <CardDescription>
                Every credit you added or spent, newest first.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overviewQuery.isPending ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((index) => (
                    <Skeleton key={index} className="h-10 w-full" />
                  ))}
                </div>
              ) : ledger.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No credit activity yet. Buy a pack above to see entries appear here.
                </p>
              ) : (
                <ul className="divide-border divide-y">
                  {ledger.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {entry.reason.replace(/_/g, " ")}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {dateFormatter.format(new Date(entry.createdAt))}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={
                            entry.delta > 0
                              ? "text-sm font-semibold tabular-nums"
                              : "text-muted-foreground text-sm font-semibold tabular-nums"
                          }
                        >
                          {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                        </p>
                        <p className="text-muted-foreground text-xs tabular-nums">
                          Balance {entry.balanceAfter}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="h-4 w-4" aria-hidden="true" />
                Purchase history
              </CardTitle>
              <CardDescription>Credit packs recorded on your account.</CardDescription>
            </CardHeader>
            <CardContent>
              {overviewQuery.isPending ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((index) => (
                    <Skeleton key={index} className="h-10 w-full" />
                  ))}
                </div>
              ) : purchases.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No purchases yet. Your credit pack receipts will be listed here.
                </p>
              ) : (
                <ul className="divide-border divide-y">
                  {purchases.map((purchase) => {
                    const pack = CREDIT_PACKS.find(
                      (entry) => entry.id === purchase.packId,
                    );
                    return (
                      <li
                        key={purchase.id}
                        className="flex items-center justify-between gap-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {pack?.name ?? purchase.packId}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {dateFormatter.format(new Date(purchase.createdAt))}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm tabular-nums">
                            {formatAmount(purchase.amountCents, purchase.currency)}
                          </span>
                          <Badge variant={statusVariant(purchase.status)}>
                            {purchase.status}
                          </Badge>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      <section aria-labelledby="usage-heading" className="space-y-3">
        <h2 id="usage-heading" className="text-xl font-semibold tracking-tight">
          Where credits are used
        </h2>
        <p className="text-muted-foreground text-sm">
          Chat runs cost {CREDIT_COSTS.chat} credit per message and image generation
          costs {CREDIT_COSTS.image} credits per image. You can run both from your
          project workspace once an AI provider key is saved in the{" "}
          <Link to="/admin" className="underline underline-offset-4">
            admin console
          </Link>
          .
        </p>
        <p className="text-muted-foreground text-sm">
          Workspace plan limits are enforced per workspace.{" "}
          <Link to="/dashboard" className="inline-flex items-center gap-1 underline underline-offset-4">
            Back to projects
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </p>
      </section>
    </div>
  );
}
