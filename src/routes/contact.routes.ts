import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { contactSchema } from "../lib/validation";
import { sanitizeInput } from "../lib/security";
import { checkRateLimit } from "../lib/rate-limiter";
import { sendContactNotificationEmail } from "../lib/email";
import { getSiteSettings } from "../lib/site";

export const contactRouter = Router();

// POST /api/contact
contactRouter.post("/", async (req: Request, res: Response) => {
  try {
    const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    const rateCheck = checkRateLimit(`contact:${ip}`, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: `Too many messages sent. Please try again in ${rateCheck.resetInSeconds} seconds.`,
      });
    }

    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || "Please check the form and try again.",
      });
    }

    const { name, email, phone, subject, message } = parsed.data;

    const saved = await prisma.contactMessage.create({
      data: {
        name: sanitizeInput(name),
        email,
        phone: sanitizeInput(phone || ""),
        subject: sanitizeInput(subject),
        message: message.trim(),
      },
    });

    const { email: storeEmail } = await getSiteSettings();
    sendContactNotificationEmail(storeEmail, {
      name: saved.name,
      email: saved.email,
      phone: saved.phone,
      subject: saved.subject,
      message: saved.message,
    }).catch((err) => console.error("Contact notification email failed:", err));

    return res.status(200).json({
      success: true,
      message: "Thanks for reaching out — our team will get back to you as soon as possible.",
    });
  } catch (error) {
    console.error("POST /api/contact error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send your message. Please try again.",
    });
  }
});
