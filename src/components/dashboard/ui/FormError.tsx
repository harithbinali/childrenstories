import { Icon } from "@/components/storyling";

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", borderRadius: 18, background: "var(--cherry-100)", color: "var(--cherry-600)", font: "700 14px/1.4 var(--font-body)" }}>
      <Icon name="warning-circle" size={20} />{message}
    </div>
  );
}
