"use client";

import type { FieldError } from "react-hook-form";

function FieldErrorMessage({ error }: { error?: FieldError }) {
  if (!error?.message) return null;
  return (
    <p className="mt-1 text-meta font-medium text-danger" role="alert">
      {error.message}
    </p>
  );
}

export function AuthInput({
  id,
  label,
  type = "text",
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: FieldError;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-meta font-semibold text-navy">
        {label}
      </label>
      <input
        id={id}
        type={type}
        className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-body text-ink shadow-[var(--shadow-soft)] outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
        {...props}
      />
      <FieldErrorMessage error={error} />
    </div>
  );
}
