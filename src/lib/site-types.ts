// Shared (client + server safe) types for storefront content served by /api/site.

export type Category = {
  slug: string;
  name: string;
  bn: string;
  emoji: string;
  tint: string; // tailwind bg class
};

export type SocialLink = { label: string; url: string };

export type SiteSettings = {
  siteName: string;
  tagline: string;
  email: string;
  phone: string; // empty = not set, hidden in the UI
  whatsapp: string; // digits only, e.g. "8801XXXXXXXXX"; empty = hidden
  address: string;
  socials: SocialLink[];
  topBarText: string;
  complaintTitle: string;
  complaintNote: string;
  freeShippingThreshold: number;
  shippingInsideDhaka: number;
  shippingOutsideDhaka: number;
};

export type HeroSlide = {
  eyebrow: string;
  title: string;
  bn: string;
  body: string;
  cta: string;
  href: string;
  gradient: string;
  emojis: string[];
  image?: string; // full-bleed banner image (text is part of the picture); gradient/emojis are skipped when set
  productImage?: string; // small round product photo shown in the decorative area of a gradient slide
};

export type SideBanner = {
  title: string;
  body: string;
  emoji: string;
  gradient: string;
  text: string;
  href?: string;
  image?: string; // small round product photo shown on the card
};

export type TrustBadge = { title: string; body: string; emoji: string };

export type NavLink = { label: string; href: string; hot?: boolean };

export type FooterColumn = { title: string; links: { label: string; href: string }[] };

export type PromoBannerContent = {
  badge: string;
  title: string;
  highlight: string;
  body: string;
  bn: string;
  cta: string;
  href: string;
};

export type SiteStat = { value: string; label: string };

export type SiteData = {
  settings: SiteSettings;
  categories: Category[];
  heroSlides: HeroSlide[];
  sideBanners: SideBanner[];
  trustBadges: TrustBadge[];
  navLinks: NavLink[];
  footerColumns: FooterColumn[];
  promoBanner: PromoBannerContent | null;
  brands: string[];
  stats: SiteStat[];
};

// Safe fallback used when the API is unreachable, so the layout never crashes.
export const EMPTY_SITE: SiteData = {
  settings: {
    siteName: "Global Shelf BD",
    tagline: "",
    email: "",
    phone: "",
    whatsapp: "",
    address: "",
    socials: [],
    topBarText: "",
    complaintTitle: "",
    complaintNote: "",
    freeShippingThreshold: 2500,
    shippingInsideDhaka: 80,
    shippingOutsideDhaka: 130,
  },
  categories: [],
  heroSlides: [],
  sideBanners: [],
  trustBadges: [],
  navLinks: [],
  footerColumns: [],
  promoBanner: null,
  brands: [],
  stats: [],
};
