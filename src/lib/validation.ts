import { z } from "zod";

// Password regex: At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const registerSchema = z
  .object({
    name: z.string().min(2, "Full Name must be at least 2 characters long").max(100),
    email: z.string().email("Please enter a valid email address").toLowerCase().trim(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(
        strongPasswordRegex,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address").toLowerCase().trim(),
});

export const verifyOtpSchema = z.object({
  email: z.string().email("Please enter a valid email address").toLowerCase().trim(),
  otp: z
    .string()
    .length(4, "OTP must be exactly 4 digits")
    .regex(/^\d{4}$/, "OTP must contain only numbers"),
});

export const resetPasswordSchema = z
  .object({
    resetToken: z.string().min(1, "Reset token authorization is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(
        strongPasswordRegex,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const googleAuthSchema = z.object({
  idToken: z.string().min(1, "Google ID Token is required"),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name.").max(150),
  email: z.string().trim().min(1, "Please enter your email address.").email("Enter a valid email address.").toLowerCase(),
  phone: z.string().trim().max(30).optional().default(""),
  subject: z.string().trim().min(2, "Please enter a subject.").max(200),
  message: z.string().trim().min(10, "Please enter a message of at least 10 characters.").max(5000),
});

export const wishlistToggleSchema = z.object({
  productId: z.string().trim().min(1, "Product ID is required"),
});

export const trackOrderSchema = z.object({
  orderId: z.string().trim().min(1, "Please enter your Order ID"),
  email: z.string().trim().min(1, "Please enter the email used for the order").email("Enter a valid email address").toLowerCase(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "processing", "out_for_delivery", "delivered", "cancelled"], {
    message: "Invalid order status",
  }),
  note: z.string().trim().max(500).optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Full Name must be at least 2 characters long").max(100),
  avatar: z
    .union([z.string().trim().url("Avatar must be a valid URL").max(500), z.literal("")])
    .optional(),
});

// Banner images are either a site-relative path ("/banners/x.jpg") or an absolute http(s) URL.
const bannerImageUrl = z
  .string()
  .trim()
  .min(1, "Banner image is required")
  .max(500)
  .refine((v) => /^\/(?!\/)/.test(v) || /^https?:\/\//i.test(v), "Banner image must be a /path or http(s) URL");

export const bannersSchema = z.object({
  banners: z
    .array(
      z.object({
        image: bannerImageUrl,
        href: z
          .string()
          .trim()
          .max(500)
          .refine((v) => v === "" || /^\/(?!\/)/.test(v) || /^https?:\/\//i.test(v), "Link must be a /path or http(s) URL")
          .transform((v) => v || "/shop")
          .default("/shop"),
        alt: z.string().trim().max(200).default(""),
      })
    )
    .max(10, "At most 10 banners are allowed"),
});

export const bannerUploadSchema = z.object({
  image: z.string().min(1, "Image (base64 or data URL) is required"),
});
