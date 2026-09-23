import nodemailer from "nodemailer";
import { orderStatusLabel } from "./order-status";

const EMAIL_HOST = process.env.EMAIL_HOST || "smtp.gmail.com";
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || "587");
const EMAIL_USER = process.env.EMAIL_USER || "";
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "Global Shelf BD <no-reply@globalshelfbd.com>";
const APP_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const emailConfigured = Boolean(EMAIL_USER && EMAIL_PASSWORD);

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD,
      },
    });
  }
  return cachedTransporter;
}

function shell(bodyHtml: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 16px; padding: 40px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .logo { text-align: center; margin-bottom: 25px; }
        .logo-title { font-size: 24px; font-weight: 800; color: #0f172a; text-decoration: none; }
        .logo-accent { color: #0284c7; }
        .title { font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 12px; }
        .text { font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 16px; }
        .otp-box { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px dashed #0284c7; border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0; }
        .otp-code { font-size: 36px; font-weight: 900; letter-spacing: 12px; color: #0369a1; font-family: monospace; }
        .warning { font-size: 13px; color: #64748b; margin-top: 20px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 15px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { text-align: left; padding: 10px 6px; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
        th { color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
        .totals td { border-bottom: none; padding: 4px 6px; }
        .status-badge { display: inline-block; padding: 6px 14px; border-radius: 999px; background: #ecfdf5; color: #047857; font-weight: 700; font-size: 13px; }
        .btn { display: inline-block; padding: 12px 24px; background: #0284c7; color: #ffffff !important; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none; margin-top: 8px; }
        .info-grid { display: block; margin: 16px 0; }
        .info-grid .row { padding: 6px 0; font-size: 14px; color: #475569; }
        .info-grid .row b { color: #1e293b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <span class="logo-title">Global Shelf <span class="logo-accent">BD</span></span>
        </div>
        ${bodyHtml}
        <div class="warning">
          This is an automated email from Global Shelf BD. Please do not reply directly to this message.
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send 4-digit OTP email using Nodemailer with HTML template
 */
export async function sendOtpEmail(to: string, otp: string, recipientName: string = "Valued Customer") {
  if (!emailConfigured) {
    console.log("\n=======================================================");
    console.log(`[DEV EMAIL SIMULATOR] To: ${to}`);
    console.log(`[DEV EMAIL SIMULATOR] Subject: Password Reset OTP Code`);
    console.log(`[DEV EMAIL SIMULATOR] Your 4-digit OTP is: ${otp}`);
    console.log("=======================================================\n");
    return true;
  }

  try {
    const htmlContent = shell(`
      <h2 class="title">Password Reset Verification Code</h2>
      <p class="text">Hello ${recipientName},</p>
      <p class="text">We received a request to reset your password for your Global Shelf BD account. Use the 4-digit verification code below to proceed:</p>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
      </div>
      <p class="text">This verification code is valid for <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email or contact support immediately.</p>
    `);

    await getTransporter().sendMail({
      from: EMAIL_FROM,
      to,
      subject: `${otp} is your Global Shelf BD Verification Code`,
      html: htmlContent,
    });

    return true;
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return false;
  }
}

export type OrderEmailItem = { name: string; emoji: string; size: string; price: number; qty: number; lineTotal: number };

export type OrderEmailData = {
  id: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  area: string;
  zone: string;
  payment: string;
  subtotal: number;
  shipping: number;
  total: number;
  createdAt: string | Date;
  items: OrderEmailItem[];
};

const money = (n: number) => `৳${n.toLocaleString("en-US")}`;

function itemsTable(items: OrderEmailItem[]): string {
  const rows = items
    .map(
      (it) => `
        <tr>
          <td>${it.emoji} ${it.name} <span style="color:#94a3b8;">(${it.size})</span></td>
          <td>× ${it.qty}</td>
          <td style="text-align:right;">${money(it.lineTotal)}</td>
        </tr>`
    )
    .join("");
  return `<table><thead><tr><th>Item</th><th>Qty</th><th style="text-align:right;">Total</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function totalsTable(order: OrderEmailData): string {
  return `
    <table class="totals">
      <tr><td>Subtotal</td><td style="text-align:right;">${money(order.subtotal)}</td></tr>
      <tr><td>Delivery</td><td style="text-align:right;">${order.shipping === 0 ? "FREE" : money(order.shipping)}</td></tr>
      <tr><td><b>Total (${order.payment === "cod" ? "Cash on Delivery" : order.payment})</b></td><td style="text-align:right;"><b>${money(order.total)}</b></td></tr>
    </table>`;
}

export async function sendOrderConfirmationEmail(order: OrderEmailData): Promise<boolean> {
  if (!order.customerEmail) return false;

  const trackUrl = `${APP_URL}/track-order?orderId=${encodeURIComponent(order.id)}&email=${encodeURIComponent(order.customerEmail)}`;
  const createdAt = new Date(order.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const html = shell(`
    <h2 class="title">Thanks for your order, ${order.customerName.split(" ")[0]}! 🎉</h2>
    <p class="text">Your order has been placed successfully. Here's your confirmation:</p>
    <div class="info-grid">
      <div class="row"><b>Order ID:</b> ${order.id}</div>
      <div class="row"><b>Order date:</b> ${createdAt}</div>
      <div class="row"><b>Status:</b> <span class="status-badge">${orderStatusLabel(order.status)}</span></div>
    </div>
    ${itemsTable(order.items)}
    ${totalsTable(order)}
    <h3 style="font-size:14px;color:#1e293b;margin-top:24px;">Delivery details</h3>
    <div class="info-grid">
      <div class="row"><b>Name:</b> ${order.customerName}</div>
      <div class="row"><b>Phone:</b> ${order.customerPhone}</div>
      <div class="row"><b>Address:</b> ${order.address}, ${order.area} (${order.zone === "dhaka" ? "Inside Dhaka" : "Outside Dhaka"})</div>
    </div>
    <p class="text" style="margin-top:24px;">You can track your order anytime using your Order ID and email address:</p>
    <div style="text-align:center;">
      <a class="btn" href="${trackUrl}">Track My Order</a>
    </div>
  `);

  if (!emailConfigured) {
    console.log("\n=======================================================");
    console.log(`[DEV EMAIL SIMULATOR] To: ${order.customerEmail}`);
    console.log(`[DEV EMAIL SIMULATOR] Subject: Order Confirmed — ${order.id}`);
    console.log(`[DEV EMAIL SIMULATOR] Order total: ${money(order.total)}, ${order.items.length} item(s)`);
    console.log(`[DEV EMAIL SIMULATOR] Track: ${trackUrl}`);
    console.log("=======================================================\n");
    return true;
  }

  try {
    await getTransporter().sendMail({
      from: EMAIL_FROM,
      to: order.customerEmail,
      subject: `Order Confirmed — ${order.id} | Global Shelf BD`,
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
    return false;
  }
}

export async function sendOrderStatusUpdateEmail(order: OrderEmailData): Promise<boolean> {
  if (!order.customerEmail) return false;

  const trackUrl = `${APP_URL}/track-order?orderId=${encodeURIComponent(order.id)}&email=${encodeURIComponent(order.customerEmail)}`;

  const html = shell(`
    <h2 class="title">Your order status has been updated</h2>
    <p class="text">Hello ${order.customerName.split(" ")[0]},</p>
    <p class="text">Order <b>${order.id}</b> is now:</p>
    <div class="otp-box" style="padding:16px;">
      <div style="font-size:22px;font-weight:900;color:${order.status === "cancelled" ? "#e11d48" : "#0369a1"};">${orderStatusLabel(order.status)}</div>
    </div>
    ${itemsTable(order.items)}
    ${totalsTable(order)}
    <div style="text-align:center;margin-top:16px;">
      <a class="btn" href="${trackUrl}">View Order Status</a>
    </div>
  `);

  if (!emailConfigured) {
    console.log("\n=======================================================");
    console.log(`[DEV EMAIL SIMULATOR] To: ${order.customerEmail}`);
    console.log(`[DEV EMAIL SIMULATOR] Subject: Order ${order.id} is now ${orderStatusLabel(order.status)}`);
    console.log("=======================================================\n");
    return true;
  }

  try {
    await getTransporter().sendMail({
      from: EMAIL_FROM,
      to: order.customerEmail,
      subject: `Order ${order.id} is now ${orderStatusLabel(order.status)} | Global Shelf BD`,
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send order status update email:", error);
    return false;
  }
}

export type ContactMessageData = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

export async function sendContactNotificationEmail(to: string, data: ContactMessageData): Promise<boolean> {
  if (!to) return false;

  const html = shell(`
    <h2 class="title">New message from the Contact Us form</h2>
    <div class="info-grid">
      <div class="row"><b>Name:</b> ${data.name}</div>
      <div class="row"><b>Email:</b> <a href="mailto:${data.email}">${data.email}</a></div>
      ${data.phone ? `<div class="row"><b>Phone:</b> ${data.phone}</div>` : ""}
      <div class="row"><b>Subject:</b> ${data.subject}</div>
    </div>
    <p class="text" style="white-space: pre-wrap; background:#f8fafc; border-radius:10px; padding:14px 16px; border:1px solid #f1f5f9;">${data.message}</p>
    <p class="text">Reply directly to this email to respond to ${data.name.split(" ")[0]}.</p>
  `);

  if (!emailConfigured) {
    console.log("\n=======================================================");
    console.log(`[DEV EMAIL SIMULATOR] To: ${to}`);
    console.log(`[DEV EMAIL SIMULATOR] Subject: New contact form message — ${data.subject}`);
    console.log(`[DEV EMAIL SIMULATOR] From: ${data.name} <${data.email}>`);
    console.log(`[DEV EMAIL SIMULATOR] Message: ${data.message}`);
    console.log("=======================================================\n");
    return true;
  }

  try {
    await getTransporter().sendMail({
      from: EMAIL_FROM,
      to,
      replyTo: data.email,
      subject: `New contact form message: ${data.subject}`,
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send contact notification email:", error);
    return false;
  }
}
