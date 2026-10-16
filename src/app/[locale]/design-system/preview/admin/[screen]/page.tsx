import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { AdminFrame } from "@/components/admin/AdminFrame";
import { OverviewView, ReportsView } from "@/components/admin/views/InsightViews";
import { CharactersAdminView, ChildrenAdminView, CustomerDetailView, CustomersView } from "@/components/admin/views/PeopleViews";
import { AuditAdminView, BooksAdminView, JobsAdminView, SupportAdminView, TicketAdminView } from "@/components/admin/views/OpsViews";
import { OrderDetailView, OrdersAdminView, PaymentsAdminView, RefundsAdminView } from "@/components/admin/views/MoneyViews";
import { AiAdminView, CatalogAdminView, ContentAdminView, GatewaysAdminView, LimitsAdminView, ProductsAdminView, SettingsAdminView } from "@/components/admin/views/ConfigViews";
import * as F from "@/lib/admin/preview-fixtures";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { Gate } from "../../../gate";

export const metadata: Metadata = { title: "Preview · Admin", robots: { index: false, follow: false } };

const STAFF = "0b6a2c1e-3333-4a1a-9a1a-000000000003";
const NOW = Date.UTC(2026, 9, 16);
/* eslint-disable @typescript-eslint/no-explicit-any -- fixtures stand in for untyped Supabase rows */
const SCREENS: Record<string, (d: Dictionary, l: Locale) => ReactNode> = {
  overview: (d, l) => <OverviewView d={d} locale={l} o={F.previewOverview} />,
  reports: (d, l) => <ReportsView d={d} locale={l} r={F.previewReport} days={30} />,
  customers: (d, l) => <CustomersView d={d} locale={l} data={F.previewCustomers} params={{}} />,
  customer: (d, l) => <CustomerDetailView d={d} locale={l} c={F.previewCustomer as any} isAdmin now={NOW} />,
  children: (d, l) => <ChildrenAdminView d={d} locale={l} data={F.previewChildren as any} params={{}} emails={F.previewEmails} />,
  characters: (d, l) => <CharactersAdminView d={d} locale={l} data={F.previewCharacters as any} params={{}} emails={F.previewEmails} />,
  books: (d, l) => <BooksAdminView d={d} locale={l} data={F.previewBooks as any} params={{}} emails={F.previewEmails} />,
  jobs: (d, l) => <JobsAdminView d={d} locale={l} data={F.previewJobs as any} params={{}} />,
  orders: (d, l) => <OrdersAdminView d={d} locale={l} data={F.previewOrders as any} params={{}} />,
  order: (d, l) => <OrderDetailView d={d} locale={l} o={F.previewOrder} isAdmin gatewayConfigured />,
  payments: (d, l) => <PaymentsAdminView d={d} locale={l} data={F.previewPayments as any} params={{}} events={F.previewWebhooks as any} isAdmin />,
  refunds: (d, l) => <RefundsAdminView d={d} locale={l} data={F.previewRefunds as any} params={{}} emails={F.previewEmails} />,
  products: (d, l) => <ProductsAdminView d={d} locale={l} products={F.previewProducts} discounts={F.previewDiscounts} />,
  themes: (d, l) => <CatalogAdminView d={d} locale={l} rows={F.previewThemes} kind="theme" />,
  styles: (d, l) => <CatalogAdminView d={d} locale={l} rows={F.previewStyles} kind="style" />,
  ai: (d) => <AiAdminView d={d} settings={F.previewAi} numbers={{ "limits.worker_concurrency": 3, "limits.daily_platform_spend_usd": 100 }} keyConfigured={false} />,
  limits: (d) => <LimitsAdminView d={d} values={F.previewLimits} />,
  gateways: (d) => <GatewaysAdminView d={d} gateways={F.previewGateways} configured={{ stripe: true, paypal: false }} />,
  content: (d, l) => <ContentAdminView d={d} locale={l} rows={F.previewContent} />,
  support: (d, l) => <SupportAdminView d={d} locale={l} data={F.previewTickets as any} params={{}} emails={F.previewEmails} me={STAFF} />,
  ticket: (d, l) => <TicketAdminView d={d} locale={l} ticket={F.previewTicket} emails={F.previewEmails} me={STAFF} />,
  audit: (d, l) => <AuditAdminView d={d} locale={l} data={F.previewAudit as any} params={{}} emails={F.previewEmails} />,
  settings: (d) => <SettingsAdminView d={d} values={F.previewSettingsValues} />,
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export function generateStaticParams() {
  return Object.keys(SCREENS).map((screen) => ({ screen }));
}

async function Screen({ params, locale }: { params: Promise<{ screen: string }>; locale: Locale }) {
  const { screen } = await params;
  const render = SCREENS[screen];
  if (!render) notFound();
  const d = getDictionary(locale);
  return <AdminFrame d={d} locale={locale} isAdmin name="Support" email="staff@example.com">{render(d, locale)}</AdminFrame>;
}

/** Admin screens with fixture data (no database needed). Internal only. */
export default async function AdminPreview({ params }: PageProps<"/[locale]/design-system/preview/admin/[screen]">) {
  const l = await localeParam();
  if (!isLocale(l)) notFound();
  return <Suspense fallback={null}><Gate><Screen params={params} locale={l} /></Gate></Suspense>;
}
