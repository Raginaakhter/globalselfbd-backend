import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { authRouter } from "./routes/auth.routes";
import { userRouter } from "./routes/user.routes";
import { productRouter } from "./routes/products.routes";
import { cartRouter } from "./routes/cart.routes";
import { orderRouter } from "./routes/orders.routes";
import { adminRouter } from "./routes/admin.routes";
import { wishlistRouter } from "./routes/wishlist.routes";
import { siteRouter } from "./routes/site.routes";
import { contactRouter } from "./routes/contact.routes";
import { newsletterRouter } from "./routes/newsletter.routes";
import { UPLOADS_DIR } from "./lib/banners";

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy (for accurate client IPs behind proxies)
app.set("trust proxy", 1);

// Allowed origins for CORS
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in development
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-test-suite", "x-forwarded-for"],
  })
);

// Body and Cookie Parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Admin-uploaded images (file names are random, so they can be cached for long)
app.use(
  "/uploads",
  express.static(UPLOADS_DIR, {
    maxAge: "30d",
    immutable: true,
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

// Root
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Global Shelf BD Backend API is running",
  });
});

// Health Check
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/products", productRouter);
app.use("/api/cart", cartRouter);
app.use("/api/orders", orderRouter);
app.use("/api/admin", adminRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/site", siteRouter);
app.use("/api/contact", contactRouter);
app.use("/api/newsletter", newsletterRouter);

// Catch-all 404 for unknown /api routes
app.use("/api/*", (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled Server Error:", err);
  res.status(500).json({
    success: false,
    message: "An internal server error occurred",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Global Shelf BD Backend API running on port ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🌐 Allowed Frontend: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
  console.log(`===============================================`);
});

export default app;
