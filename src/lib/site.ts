import { prisma } from "./prisma";
import {
  EMPTY_SITE,
  type FooterColumn,
  type HeroSlide,
  type NavLink,
  type PromoBannerContent,
  type SideBanner,
  type SiteData,
  type SiteSettings,
  type TrustBadge,
} from "./site-types";

function parse<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Storefront settings only (used by the cart/order APIs to price shipping). */
export async function getSiteSettings(): Promise<SiteSettings> {
  const row = await prisma.siteContent.findUnique({ where: { key: "settings" } });
  return { ...EMPTY_SITE.settings, ...parse<Partial<SiteSettings>>(row?.value, {}) };
}

/** Everything the storefront needs, assembled from the database. */
export async function getSiteData(): Promise<SiteData> {
  const [contentRows, categories, brandRows, productCount, customerCount, orderCount] = await Promise.all([
    prisma.siteContent.findMany(),
    prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.product.findMany({ where: { active: true }, select: { brand: true }, distinct: ["brand"], orderBy: { brand: "asc" } }),
    prisma.product.count({ where: { active: true } }),
    prisma.user.count(),
    prisma.order.count(),
  ]);

  const content = Object.fromEntries(contentRows.map((r) => [r.key, r.value]));

  return {
    settings: { ...EMPTY_SITE.settings, ...parse<Partial<SiteSettings>>(content.settings, {}) },
    categories: categories.map(({ slug, name, bn, emoji, tint }) => ({ slug, name, bn, emoji, tint })),
    heroSlides: parse<HeroSlide[]>(content.heroSlides, []),
    sideBanners: parse<SideBanner[]>(content.sideBanners, []),
    trustBadges: parse<TrustBadge[]>(content.trustBadges, []),
    navLinks: parse<NavLink[]>(content.navLinks, []),
    footerColumns: parse<FooterColumn[]>(content.footerColumns, []),
    promoBanner: parse<PromoBannerContent | null>(content.promoBanner, null),
    brands: brandRows.map((b) => b.brand),
    // Real numbers from the database — no invented figures.
    stats: [
      { value: productCount.toLocaleString("en-US"), label: "Products in store" },
      { value: customerCount.toLocaleString("en-US"), label: "Registered customers" },
      { value: orderCount.toLocaleString("en-US"), label: "Orders placed" },
    ],
  };
}
