/**
 * Payment gateway abstraction. Adding a gateway = implement this interface,
 * add it to the payment_gateway enum, and add a webhook route.
 */
export type GatewayId = "stripe" | "paypal";

export type CheckoutInput = {
  orderId: string;
  orderNumber: number;
  amount: number; // minor units
  currency: string;
  description: string;
  customerEmail: string | null;
  locale: "en" | "ar";
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutSession = { checkoutId: string; redirectUrl: string };

export type RefundInput = { orderId: string; gatewayPaymentId: string; amount: number; currency: string; reason?: string; idempotencyKey: string };
export type RefundResult = { gatewayRefundId: string; status: "pending" | "succeeded" | "failed" };

export interface PaymentGateway {
  id: GatewayId;
  createCheckout(input: CheckoutInput): Promise<CheckoutSession>;
  refund(input: RefundInput): Promise<RefundResult>;
}
