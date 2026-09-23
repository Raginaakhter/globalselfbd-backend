// Default storefront content. Seeded ONLY when a row is missing, so edits made in the
// database (e.g. via `npx prisma studio`) are never overwritten by re-running the seed.

import type { PrismaClient } from "@prisma/client";

export const defaultCategories = [
  { slug: "vitamins", name: "Vitamins & Supplements", bn: "ভিটামিন ও সাপ্লিমেন্ট", emoji: "💊", tint: "bg-emerald-50" },
  { slug: "health", name: "Health & Medicines", bn: "স্বাস্থ্য ও ওষুধ", emoji: "🩺", tint: "bg-sky-50" },
  { slug: "beauty", name: "Beauty & Makeup", bn: "বিউটি ও মেকআপ", emoji: "💄", tint: "bg-rose-50" },
  { slug: "skincare", name: "Skin Care", bn: "স্কিন কেয়ার", emoji: "🧴", tint: "bg-amber-50" },
  { slug: "baby", name: "Baby & Mum", bn: "শিশু ও মা", emoji: "🍼", tint: "bg-violet-50" },
  { slug: "personal-care", name: "Personal Care", bn: "পার্সোনাল কেয়ার", emoji: "🧼", tint: "bg-cyan-50" },
  { slug: "fragrance", name: "Fragrances", bn: "সুগন্ধি", emoji: "🌸", tint: "bg-pink-50" },
  { slug: "grocery", name: "Global Grocery", bn: "আন্তর্জাতিক গ্রোসারি", emoji: "🛒", tint: "bg-lime-50" },
  { slug: "snacks", name: "Snacks & Drinks", bn: "স্ন্যাক্স ও পানীয়", emoji: "🍫", tint: "bg-orange-50" },
  { slug: "devices", name: "Medical Devices", bn: "মেডিকেল ডিভাইস", emoji: "🌡️", tint: "bg-teal-50" },
  { slug: "sun-care", name: "Sun Care", bn: "সান কেয়ার", emoji: "🧴", tint: "bg-yellow-50" },
  { slug: "home", name: "Home & Kitchen", bn: "হোম ও কিচেন", emoji: "🏠", tint: "bg-indigo-50" },
];

export const defaultContent: Record<string, unknown> = {
  settings: {
    siteName: "Global Shelf BD",
    tagline: "Bringing authentic global health, beauty and everyday products to Bangladesh at honest prices.",
    email: "info@globalshelfbd.com",
    phone: "01552405670",
    whatsapp: "8801552405670",
    address: "Holding # 67/A, Rabindra Sarani, Sector # 7 (near Azampur), Uttara, Dhaka, Bangladesh, 1230",
    socials: [],
    topBarText: "সারা বাংলাদেশে ডেলিভারি",
    complaintTitle: "আপনার অভিযোগ জানান",
    complaintNote: "We read every message and respond within 24 hours.",
    freeShippingThreshold: 10000,
    shippingInsideDhaka: 80,
    shippingOutsideDhaka: 130,
  },
  heroSlides: [
    {
      eyebrow: "",
      title: "Global Bestsellers, Delivered To Your Door",
      bn: "",
      body: "",
      cta: "Shop Now",
      href: "/shop",
      gradient: "from-brand-600 via-brand-700 to-navy-700",
      emojis: [],
      image: "/banners/hero-global-bestsellers.jpg",
    },
    {
      eyebrow: "Mega Health Sale",
      title: "Save up to 70% off RRP",
      bn: "আসল দামের চেয়ে ৭০% পর্যন্ত কম",
      body: "Vitamins, supplements and everyday wellness from the world's most trusted brands.",
      cta: "Shop Vitamins",
      href: "/shop?category=vitamins",
      gradient: "from-brand-600 via-brand-700 to-navy-700",
      emojis: ["💊","🍊","🌿"],
      productImage: "/products/sr8872454324474.png",
    },
    {
      eyebrow: "Beauty Week",
      title: "Glow up for less",
      bn: "সৌন্দর্যের যত্নে বিশেষ ছাড়",
      body: "Skin care, makeup and fragrances from K-beauty to European classics — delivered to your door.",
      cta: "Shop Beauty",
      href: "/shop?category=beauty",
      gradient: "from-rose-500 via-pink-600 to-navy-700",
      emojis: ["💄","🧴","🌸"],
      productImage: "/products/sr8335205531898.png",
    },
    {
      eyebrow: "Baby & Mum",
      title: "Gentle care for little ones",
      bn: "আপনার শিশুর জন্য নিরাপদ পণ্য",
      body: "Formula, nappies, baby skincare and mum essentials — dermatologically tested and imported.",
      cta: "Shop Baby & Mum",
      href: "/shop?category=baby",
      gradient: "from-sky-500 via-brand-600 to-navy-700",
      emojis: ["🍼","🧸","👶"],
      productImage: "/products/sr7995428438266.png",
    },
  ],
  sideBanners: [
    {
      title: "Price Beat Guarantee",
      body: "Found it cheaper elsewhere? We'll beat it.",
      emoji: "🏷️",
      gradient: "from-sun-400 to-sun-500",
      text: "text-navy-800",
      href: "/shop?sort=discount",
      image: "/products/sr7882661101818.png",
    },
    {
      title: "Free Delivery ৳10,000+",
      body: "Across Dhaka, Chattogram & beyond.",
      emoji: "🚚",
      gradient: "from-navy-600 to-navy-800",
      text: "text-white",
      href: "/shop?sort=discount",
      image: "/products/sr7460113744122.png",
    },
  ],
  trustBadges: [
    { title: "100% Authentic", body: "Sourced directly from global brands & authorised distributors.", emoji: "✅" },
    { title: "Fast Delivery", body: "Same-day in Dhaka, 2–4 days nationwide.", emoji: "🚚" },
    { title: "Best Price Promise", body: "Lower prices every day, or we'll match it.", emoji: "💰" },
    { title: "Easy Returns", body: "7-day hassle-free returns on eligible items.", emoji: "↩️" },
  ],
  navLinks: [
    { label: "Top Deals", href: "/shop?sort=discount", hot: true },
    { label: "New Arrivals", href: "/shop?sort=new" },
    { label: "Best Sellers", href: "/shop?sort=popular" },
    { label: "Brands", href: "/#brands" },
    { label: "Clearance", href: "/shop?sort=discount" },
    { label: "About Us", href: "/about" },
    { label: "Help & Contact", href: "/contact" },
  ],
  // Only links to pages that exist. Add more here as pages are built.
  footerColumns: [
    {
      title: "Shop",
      links: [
        { label: "Vitamins & Supplements", href: "/shop?category=vitamins" },
        { label: "Beauty & Skin Care", href: "/shop?category=skincare" },
        { label: "Baby & Mum", href: "/shop?category=baby" },
        { label: "Global Grocery", href: "/shop?category=grocery" },
        { label: "Medical Devices", href: "/shop?category=devices" },
      ],
    },
    {
      title: "Customer Care",
      links: [
        { label: "All Products", href: "/shop" },
        { label: "My Cart", href: "/cart" },
        { label: "My Wishlist", href: "/wishlist" },
        { label: "My Account", href: "/profile" },
        { label: "Track Order", href: "/track-order" },
        { label: "Contact Us", href: "/contact" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About Us", href: "/about" },
        { label: "Terms of Service", href: "/terms" },
        { label: "Refund / Return Policy", href: "/refund-policy" },
        { label: "Shipping & Delivery Policy", href: "/shipping-policy" },
        { label: "Privacy Policy", href: "/privacy-policy" },
      ],
    },
  ],
  promoBanner: {
    badge: "Clearance",
    title: "Clearance stock — save big on",
    highlight: "selected lines",
    body: "Last chance on selected vitamins, skin care and grocery lines. Limited quantities while stock lasts.",
    bn: "সীমিত স্টক — এখনই অর্ডার করুন!",
    cta: "Shop Clearance",
    href: "/shop?sort=discount",
  },
};

export async function seedSiteContent(prisma: PrismaClient) {
  for (const [i, c] of defaultCategories.entries()) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...c, sortOrder: i },
    });
  }

  for (const [key, value] of Object.entries(defaultContent)) {
    await prisma.siteContent.upsert({
      where: { key },
      update: {},
      create: { key, value: JSON.stringify(value) },
    });
  }
}
