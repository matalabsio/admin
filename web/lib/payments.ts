import { ApiError, parseApiError, parseJsonResponse, type ApiErrorBody } from "@/lib/api";
import { isValidIndiaMobile10, normalizeIndiaMobile, toIndiaE164 } from "@/lib/india-mobile";

export type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  duration_days: number;
  sort_order: number;
};

export type CheckoutContact = {
  name: string | null;
  email: string | null;
  contact: string | null;
};

export type CreateOrderResult = {
  order_id: string;
  key_id: string;
  amount: number;
  currency: string;
  plan_name: string;
  checkout_contact: CheckoutContact;
  checkout_config_id?: string | null;
};

export type Subscription = {
  is_active: boolean;
  plan_slug: string | null;
  plan_name: string | null;
  status: string | null;
  starts_at: string | null;
  expires_at: string | null;
};

export type PaymentHistoryItem = {
  id: string;
  plan_name: string | null;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  razorpay_payment_id: string | null;
};

export type RazorpayHandlerResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

/** Pending fulfillment + receipt: saved as soon as Razorpay handler fires. */
export type CheckoutReceiptContext = {
  order_id: string;
  payment_id: string;
  signature: string;
  plan_name?: string | null;
  amount?: number;
  currency?: string;
};

const CHECKOUT_RECEIPT_KEY = "bf_checkout_receipt";

export function saveCheckoutReceiptContext(ctx: CheckoutReceiptContext): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CHECKOUT_RECEIPT_KEY, JSON.stringify(ctx));
  } catch {
    /* quota / private mode */
  }
}

export function readCheckoutReceiptContext(): CheckoutReceiptContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CHECKOUT_RECEIPT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckoutReceiptContext;
    if (!parsed?.order_id || !parsed?.payment_id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCheckoutReceiptContext(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CHECKOUT_RECEIPT_KEY);
  } catch {
    /* ignore */
  }
}

/** Re-run verify from the pending sessionStorage payload (requires signature). */
export function pendingVerifyPayloadFromReceipt(
  ctx: CheckoutReceiptContext,
): RazorpayHandlerResponse | null {
  if (!ctx.signature) return null;
  return {
    razorpay_order_id: ctx.order_id,
    razorpay_payment_id: ctx.payment_id,
    razorpay_signature: ctx.signature,
  };
}

async function paymentsCall<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/payments${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = await parseJsonResponse<T | ApiErrorBody>(res);
  if (!res.ok) {
    throw new ApiError(parseApiError(body as ApiErrorBody, res.status), res.status);
  }
  return body as T;
}

export function getPlans(): Promise<{
  plans: Plan[];
  payments_enabled: boolean;
  checkout_test_mode: boolean;
}> {
  return paymentsCall<{
    plans: Plan[];
    payments_enabled: boolean;
    checkout_test_mode: boolean;
  }>("/plans");
}

export function createOrder(planSlug: string): Promise<CreateOrderResult> {
  return paymentsCall<CreateOrderResult>("/create-order", {
    method: "POST",
    body: JSON.stringify({ plan_slug: planSlug }),
  });
}

export function verifyPayment(
  response: RazorpayHandlerResponse,
): Promise<{ ok: boolean; subscription: Subscription }> {
  return paymentsCall<{ ok: boolean; subscription: Subscription }>("/verify", {
    method: "POST",
    body: JSON.stringify(response),
  });
}

export function getSubscription(): Promise<Subscription> {
  return paymentsCall<Subscription>("/subscription");
}

export function getPaymentHistory(): Promise<{ payments: PaymentHistoryItem[] }> {
  return paymentsCall<{ payments: PaymentHistoryItem[] }>("/history");
}

/** Structured checkout/verify trail (browser console). Never log signature values. */
export function paymentTraceLog(
  event: string,
  fields: Record<string, string | boolean | number | null | undefined> = {},
): void {
  console.info(
    JSON.stringify({
      scope: "bandforge_payments",
      event,
      ...fields,
    }),
  );
}

/** Display helper: backend stores amounts in paise. */
export function formatInr(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: rupees % 1 === 0 ? 0 : 2,
  }).format(rupees);
}

// --- Razorpay checkout script + popup -------------------------------------

type RazorpayInstrument = {
  method: string;
  /** UPI flows: qr (desktop), intent (mobile). Avoid collect (deprecated 2026). */
  flows?: Array<"qr" | "intent" | "collect">;
};

type RazorpayDisplayConfig = {
  display: {
    blocks?: Record<string, { name: string; instruments: RazorpayInstrument[] }>;
    hide?: RazorpayInstrument[];
    sequence: string[];
    preferences?: { show_default_blocks?: boolean };
  };
};

type RazorpayMethodOption =
  | {
      upi?: boolean;
      card?: boolean;
      netbanking?: boolean;
      wallet?: boolean;
      paylater?: boolean;
    }
  | "upi";

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler: (response: RazorpayHandlerResponse) => void;
  prefill: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void; confirm_close?: boolean };
  checkout_config_id?: string;
  config?: RazorpayDisplayConfig;
  method?: RazorpayMethodOption;
  readonly?: { email?: boolean; contact?: boolean; name?: boolean };
  remember_customer?: boolean;
  send_sms_hash?: boolean;
  retry?: { enabled: boolean; max_count: number };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

/** Razorpay card OTP is SMS'd to prefill.contact — E.164 +91… per Razorpay docs. */
function razorpayContactPrefill(raw: string | null | undefined): {
  contact?: string;
  contactEditable: boolean;
} {
  if (!raw?.trim()) {
    return { contactEditable: true };
  }
  const digits = normalizeIndiaMobile(raw);
  if (isValidIndiaMobile10(digits)) {
    return { contact: toIndiaE164(digits), contactEditable: true };
  }
  return { contactEditable: true };
}

/**
 * Fallback when Dashboard Payment Configuration ID is not set.
 * Prefers UPI QR (desktop) + Intent (mobile). Collect/VPA typing is omitted (NPCI 2026).
 * Cannot enable UPI if the Razorpay account has not activated the method — use Dashboard
 * Payment Configuration + RAZORPAY_CHECKOUT_CONFIG_ID for production certainty.
 */
const RAZORPAY_FALLBACK_CHECKOUT_CONFIG: RazorpayDisplayConfig = {
  display: {
    blocks: {
      upi_preferred: {
        name: "Pay using UPI",
        instruments: [{ method: "upi", flows: ["qr", "intent"] }],
      },
    },
    sequence: ["block.upi_preferred", "upi", "card", "netbanking", "wallet"],
    hide: [{ method: "paylater" }],
    preferences: { show_default_blocks: true },
  },
};

function isMobileUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_SCRIPT}"]`,
    );
    if (existing) {
      const marker = existing.dataset.bfRzp;
      if (marker === "ready") {
        resolve(Boolean(window.Razorpay));
        return;
      }
      if (marker === "error") {
        resolve(false);
        return;
      }
      // Already loaded without our marker (e.g. cached) — do not hang on load.
      if (window.Razorpay) {
        existing.dataset.bfRzp = "ready";
        resolve(true);
        return;
      }
      // Mid-load: wait for one-shot load/error (do not resolve false immediately).
      const onLoad = () => {
        existing.dataset.bfRzp = "ready";
        cleanup();
        resolve(Boolean(window.Razorpay));
      };
      const onError = () => {
        existing.dataset.bfRzp = "error";
        cleanup();
        resolve(false);
      };
      const cleanup = () => {
        existing.removeEventListener("load", onLoad);
        existing.removeEventListener("error", onError);
      };
      existing.addEventListener("load", onLoad);
      existing.addEventListener("error", onError);
      return;
    }
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => {
      script.dataset.bfRzp = "ready";
      resolve(true);
    };
    script.onerror = () => {
      script.dataset.bfRzp = "error";
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Razorpay Standard Checkout options for BandForge one-time subscription pay.
 * Exported for diagnostics — do not add user_id, plan_slug, or learning data.
 */
export function buildRazorpayCheckoutOptions(opts: {
  order: CreateOrderResult;
  onSuccess: (response: RazorpayHandlerResponse) => void;
  onDismiss: () => void;
}): RazorpayOptions {
  const { order } = opts;
  const { contact } = razorpayContactPrefill(order.checkout_contact.contact);
  const configId = order.checkout_config_id?.trim();
  const mobileUpiPreferred =
    isMobileUserAgent() &&
    Boolean(order.checkout_contact.email) &&
    Boolean(contact);

  const options: RazorpayOptions = {
    key: order.key_id,
    amount: order.amount,
    currency: order.currency,
    name: "BandForge",
    description: "BandForge Subscription",
    order_id: order.order_id,
    handler: opts.onSuccess,
    prefill: {
      name: order.checkout_contact.name ?? undefined,
      email: order.checkout_contact.email ?? undefined,
      contact,
    },
    theme: { color: "#0d1f3c" },
    modal: { ondismiss: opts.onDismiss, confirm_close: true },
    method: mobileUpiPreferred
      ? "upi"
      : {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
          paylater: false,
        },
    // One-time pay — no saved cards / Flash tokenization OTP (real SMS in test mode).
    remember_customer: false,
    send_sms_hash: false,
    readonly: {
      email: Boolean(order.checkout_contact.email),
      name: Boolean(order.checkout_contact.name),
      contact: false,
    },
    retry: { enabled: true, max_count: 3 },
  };

  if (configId) {
    // Dashboard Payment Configuration controls UPI QR, Intent, cards, etc.
    options.checkout_config_id = configId;
  } else {
    options.config = RAZORPAY_FALLBACK_CHECKOUT_CONFIG;
  }

  return options;
}

/**
 * Open the hosted Razorpay checkout. Only minimal data (amount, currency,
 * order id, key, and name/email/phone prefill) is passed — no learning,
 * diagnostic, or behavioural data.
 */
export async function openRazorpayCheckout(opts: {
  order: CreateOrderResult;
  onSuccess: (response: RazorpayHandlerResponse) => void;
  onDismiss: () => void;
  onFailed?: (message: string) => void;
}): Promise<boolean> {
  const ok = await loadRazorpayScript();
  if (!ok || !window.Razorpay) return false;

  // Success/fail settles checkout; dismiss must not show "cancelled" after pay.
  let settled = false;
  const options = buildRazorpayCheckoutOptions({
    order: opts.order,
    onSuccess: (response) => {
      settled = true;
      opts.onSuccess(response);
    },
    onDismiss: () => {
      if (settled) return;
      opts.onDismiss();
    },
  });
  if (process.env.NODE_ENV === "development") {
    console.info("[bandforge/razorpay-checkout]", {
      remember_customer: options.remember_customer,
      contact: options.prefill.contact,
      order_id: options.order_id,
      checkout_config_id: options.checkout_config_id ?? null,
      fallback_config: Boolean(options.config),
    });
  }
  const rzp = new window.Razorpay(options);
  rzp.on("payment.failed", (response) => {
    settled = true;
    const message =
      response.error?.description ?? "Payment failed. Please try again.";
    opts.onFailed?.(message);
  });
  rzp.open();
  return true;
}
