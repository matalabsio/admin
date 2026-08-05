import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  CreditCard,
  Gauge,
  LayoutDashboard,
  Library,
  Mic,
  ScrollText,
  Users,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  exact?: boolean;
  description?: string;
  /** Extra path prefixes that should also mark this item active. */
  match?: string[];
};

export type AdminNavGroup = {
  title?: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        Icon: LayoutDashboard,
        exact: true,
        description: "Metrics and quick actions",
      },
      {
        href: "/admin/question-bank/overview",
        label: "Question bank",
        Icon: Library,
        description: "Inventory, coverage, and set builders",
        match: ["/admin/question-bank"],
      },
      {
        href: "/admin/users",
        label: "Users",
        Icon: Users,
        description: "Accounts and activity",
      },
      {
        href: "/admin/speaking",
        label: "Evaluator",
        Icon: Mic,
        description: "Speaking, writing, and diagnostic reviews",
        match: ["/admin/writing", "/admin/diagnostics"],
      },
      {
        href: "/admin/review-analytics",
        label: "Review analytics",
        Icon: BarChart3,
        description: "Agreement, overrides, and criterion MAE",
      },
      {
        href: "/admin/payments",
        label: "Payments",
        Icon: CreditCard,
        description: "Revenue and subscriptions",
        match: ["/admin/subscriptions"],
      },
      {
        href: "/admin/ai",
        label: "AI ops",
        Icon: Activity,
        description: "Budget, latency, and provider health",
      },
      {
        href: "/admin/reliability",
        label: "Reliability",
        Icon: Gauge,
        description: "Learning/practice counters, latency, and outbox",
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        href: "/admin/settings/audit",
        label: "Audit log",
        Icon: ScrollText,
        description: "Admin action history",
      },
    ],
  },
];

export type AdminTopNavItem = {
  href: string;
  label: string;
  exact?: boolean;
  /** Extra path prefixes that should also mark this item active. */
  match?: string[];
};

/** Horizontal top nav (design system). */
export const ADMIN_TOP_NAV: AdminTopNavItem[] = [
  { href: "/admin", label: "Dashboard", exact: true },
  {
    href: "/admin/question-bank/overview",
    label: "Question bank",
    match: ["/admin/question-bank"],
  },
  { href: "/admin/users", label: "Users" },
  {
    href: "/admin/speaking",
    label: "Evaluators",
    match: ["/admin/writing", "/admin/diagnostics"],
  },
  { href: "/admin/review-analytics", label: "Analytics" },
  {
    href: "/admin/payments",
    label: "Payments",
    match: ["/admin/subscriptions"],
  },
  { href: "/admin/ai", label: "AI ops" },
  { href: "/admin/reliability", label: "Reliability" },
];

/** Mobile fixed bottom tab bar. */
export const ADMIN_BOTTOM_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", Icon: Users },
  { href: "/admin/speaking", label: "Evaluator", Icon: Mic, match: ["/admin/writing", "/admin/diagnostics"] },
  {
    href: "/admin/payments",
    label: "Payments",
    Icon: CreditCard,
    match: ["/admin/subscriptions"],
  },
];
