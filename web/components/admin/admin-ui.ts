/** Shared admin styling — Forge Navy / Teal / Cyan palette (design system). */

export const adminPageBg = "min-h-dvh bg-surface text-navy";

export const adminCard =
  "rounded-[18px] border border-[#EAEEF3] bg-white p-4 shadow-[0_8px_22px_rgba(13,31,60,0.04)] sm:p-6";

export const adminHeading = "font-display font-bold text-navy";

export const adminSubtext = "text-sm font-light text-[#5A6B82]";

export const adminMeta = "font-mono text-xs font-medium text-[#94A3B8]";

export const adminMutedLabel =
  "font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#94A3B8]";

export const adminLink = "font-semibold text-teal hover:text-cyan";

export const adminBtnPrimary =
  "inline-flex cursor-pointer items-center justify-center rounded-[11px] bg-cyan px-4 py-2.5 text-sm font-bold text-navy shadow-[0_10px_24px_rgba(0,188,212,0.30)] transition-colors hover:bg-brand-sky-hover disabled:opacity-60";

export const adminBtnSecondary =
  "inline-flex cursor-pointer items-center justify-center rounded-[11px] border border-[#CDD7E2] bg-white px-4 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-cyan-soft/40";

export const adminInput =
  "mt-1 w-full rounded-[11px] border border-[#E4E9F0] bg-white px-3 py-2.5 text-navy placeholder:text-[#94A3B8] focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20";

export const adminTable =
  "overflow-x-auto rounded-[18px] border border-[#EAEEF3] bg-white";

export const adminTableHead =
  "border-b border-[#EDF1F6] bg-[#FBFCFE] font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-[#94A3B8]";

export const adminAvatar =
  "inline-flex size-10 items-center justify-center rounded-full bg-cyan font-mono text-sm font-semibold text-navy";

export const adminFilterPill =
  "inline-flex items-center gap-1 rounded-full border border-[#D6E0EA] bg-white px-3 py-1.5 text-xs font-semibold text-[#5A6B82] transition-colors hover:bg-cyan-soft/40";

export const adminFilterPillActive =
  "border-cyan bg-cyan text-navy shadow-[0_8px_18px_rgba(0,188,212,0.3)]";

export type AdminStatusTone =
  | "live"
  | "draft"
  | "archived"
  | "pending"
  | "in_review"
  | "completed"
  | "inactive";

export const adminStatusBadgeStyles: Record<AdminStatusTone, string> = {
  live: "bg-[#E8F7EF] text-[#15935B]",
  draft: "bg-[#FBF1D9] text-[#B7791F]",
  archived: "bg-[#F1F4F8] text-[#94A3B8]",
  pending: "bg-[#FBF1D9] text-[#B7791F]",
  in_review: "bg-[#E0F5F8] text-[#0097A7]",
  completed: "bg-[#E8F7EF] text-[#15935B]",
  inactive: "bg-[#FEE2E2] text-[#B91C1C]",
};

export function adminInitials(name?: string | null, email?: string | null): string {
  const source = (name || email || "AD").trim();
  if (!source) return "AD";
  const cleaned = source.replace(/[^a-zA-Z0-9 ]/g, " ");
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

/** @deprecated Use AdminTopNav — kept for legacy references during migration */
export const adminHeader =
  "sticky top-0 z-20 border-b border-navy/10 bg-navy text-white";

/** @deprecated Sidebar removed in design system */
export const adminSidebar = "border-r border-border bg-white shadow-lg";
