import { z } from "zod";
import {
  isValidIndiaMobile10,
  normalizeIndiaMobile,
} from "@/lib/india-mobile";

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Enter a valid email");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  full_name: z.string().max(120).optional(),
  email: emailSchema,
  password: passwordSchema,
});

export const phoneSchema = z.object({
  phone: z
    .string()
    .min(1, "Mobile number is required")
    .refine((v) => isValidIndiaMobile10(normalizeIndiaMobile(v)), {
      message: "Enter a valid 10-digit Indian mobile number.",
    }),
});

export const otpSchema = z.object({
  phone: z.string(),
  code: z
    .string()
    .length(6, "Enter the 6-digit OTP")
    .regex(/^\d+$/, "OTP must be digits only"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(16, "Invalid reset link"),
  password: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PhoneInput = z.infer<typeof phoneSchema>;
export type OtpInput = z.infer<typeof otpSchema>;
