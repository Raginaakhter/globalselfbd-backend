import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { checkRateLimit } from "../lib/rate-limiter";

export const newsletterRouter = Router();

const subscribeSchema = z.object({
  email: z.string().email("Please enter a valid email address").toLowerCase().trim(),
});

// POST /api/newsletter
newsletterRouter.post("/", async (req: Request, res: Response) => {
  try {
    const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    const rate = checkRateLimit(`newsletter:${ip}`, 5, 15 * 60 * 1000);
    if (!rate.allowed) {
      return res.status(429).json({
        success: false,
        message: `Too many attempts. Try again in ${rate.resetInSeconds} seconds.`,
      });
    }

    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || "Invalid email",
      });
    }

    await prisma.newsletterSubscriber.upsert({
      where: { email: parsed.data.email },
      update: {},
      create: { email: parsed.data.email },
    });

    return res.status(200).json({ success: true, message: "Thanks — you're on the list!" });
  } catch (error) {
    console.error("POST /api/newsletter error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
});
