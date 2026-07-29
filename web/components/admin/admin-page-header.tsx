"use client";

import type { ReactNode } from "react";
import { adminHeading, adminMutedLabel, adminSubtext } from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
};

export function AdminPageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: Props) {
  return (
    <header className={cn("flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between", className)}>
      <div>
        {eyebrow ? <p className={adminMutedLabel}>{eyebrow}</p> : null}
        <h1 className={cn(adminHeading, "mt-1 text-2xl sm:text-[2rem]")}>{title}</h1>
        {subtitle ? <p className={cn(adminSubtext, "mt-1")}>{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{actions}</div> : null}
    </header>
  );
}
