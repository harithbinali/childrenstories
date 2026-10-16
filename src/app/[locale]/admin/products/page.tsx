import { adminMetadata, adminRoute } from "@/components/admin/page";
import { ProductsAdminView } from "@/components/admin/views/ConfigViews";
import { getProductsAndDiscounts } from "@/lib/admin/queries";

export const generateMetadata = adminMetadata((d) => d.admin.nav.products);

export default adminRoute(async ({ d, locale }) => <ProductsAdminView d={d} locale={locale} {...await getProductsAndDiscounts()} />, { admin: true });
