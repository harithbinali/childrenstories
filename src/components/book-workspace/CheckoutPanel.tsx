"use client";
import { useState, useTransition } from "react";
import { Button, Card, Icon, Input, Scallop, Tag } from "@/components/storyling";
import { FormError } from "@/components/dashboard/ui/FormError";
import { checkoutBook } from "@/lib/books/actions";

export function CheckoutPanel({ bookId, price, gateways, labels, errors }: {
  bookId: string; price: string; gateways: Array<"stripe" | "paypal">; errors: Record<string, string>;
  labels: { title: string; includes: readonly string[]; payWith: string; card: string; discount: string; buy: string; redirecting: string; paymentsOff: string };
}) {
  const [gateway, setGateway] = useState<"stripe" | "paypal" | undefined>(gateways[0]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card variant="outlined" padding={0} style={{ overflow: "visible", maxWidth: 520 }}>
      <div style={{ background: "var(--sun-400)", borderRadius: "28px 28px 0 0", padding: "24px 26px 12px" }}>
        <h2 style={{ font: "var(--type-h3)" }}>{labels.title}</h2>
        <div style={{ font: "700 44px/1.1 var(--font-display)", color: "var(--ink-900)", marginTop: 6 }}>{price}</div>
      </div>
      <Scallop color="var(--sun-400)" size={24} />
      <div style={{ padding: "16px 26px 26px", display: "grid", gap: 16 }}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          {labels.includes.map((i) => <li key={i} style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 600, color: "var(--ink-800)" }}><Icon name="check-circle" color="var(--mint-500)" size={22} />{i}</li>)}
        </ul>
        {gateways.length === 0 ? (
          <p style={{ color: "var(--ink-500)" }}>{labels.paymentsOff}</p>
        ) : (
          <>
            {gateways.length > 1 && (
              <div className="sl-field">
                <span className="sl-label">{labels.payWith}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {gateways.includes("stripe") && <Tag icon="credit-card" selected={gateway === "stripe"} onClick={() => setGateway("stripe")}>{labels.card}</Tag>}
                  {gateways.includes("paypal") && <Tag icon="paypal-logo" selected={gateway === "paypal"} onClick={() => setGateway("paypal")}>PayPal</Tag>}
                </div>
              </div>
            )}
            <Input label={labels.discount} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={32} iconStart="tag" dir="ltr" />
            <FormError message={error} />
            <Button size="lg" block iconStart="lock-key" disabled={!gateway || pending} onClick={() => start(async () => {
              setError(null);
              const r = await checkoutBook(bookId, gateway!, code);
              if (r.ok) window.location.assign(r.data.url);
              else setError(errors[r.error] ?? errors.unknown);
            })}>{pending ? labels.redirecting : labels.buy}</Button>
          </>
        )}
      </div>
    </Card>
  );
}
