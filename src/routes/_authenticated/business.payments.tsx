import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, CreditCard, ReceiptText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getBusinessPayments, getBusinessProfile, requireBusinessAccess } from "@/lib/business";

export const Route = createFileRoute("/_authenticated/business/payments")({
  beforeLoad: requireBusinessAccess,
  head: () => ({ meta: [{ title: "LikeAirGo Business Payments" }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const { user } = useAuth();
  const business = useQuery({
    queryKey: ["business-profile", user?.id],
    enabled: !!user?.id,
    queryFn: () => getBusinessProfile(user!.id),
  });
  const payments = useQuery({
    queryKey: ["business-payments", business.data?.id],
    enabled: !!business.data?.id,
    queryFn: () => getBusinessPayments(business.data!.id),
  });

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground">
      <div className="mx-auto max-w-3xl">
        <a
          href="/business/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
        </a>
        <div className="mt-7">
          <div className="text-[11px] font-bold tracking-[0.18em] text-teal">PAYMENTS</div>
          <h1 className="mt-2 font-display text-3xl font-black">Payment history</h1>
          <p className="mt-2 text-sm text-muted-foreground">View your promotion payment records.</p>
          <div className="mt-3 rounded-xl border border-coral/30 bg-coral/5 p-3 text-xs text-coral">
            No payment provider is connected. Business promotions are free for now, and this page
            only shows historical payment records.
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {payments.data?.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal/10 text-teal">
                {payment.status === "successful" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <CreditCard className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold">TZS {payment.amount.toLocaleString()}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Promotion payment · {new Date(payment.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold capitalize text-teal">{payment.status}</div>
                {payment.receipt_url && (
                  <a
                    href={payment.receipt_url}
                    className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground"
                  >
                    <ReceiptText className="h-3 w-3" /> Receipt
                  </a>
                )}
              </div>
            </div>
          ))}
          {payments.data?.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No payments yet.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
