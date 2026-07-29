"use client";

import {
  evaluatorBtnPrimary,
  evaluatorBtnSecondary,
  evaluatorCard,
  evaluatorCardPad,
  evaluatorTextarea,
} from "@/components/admin/evaluator/evaluator-ui";
import { cn } from "@/lib/utils";

type Props = {
  feedback: string;
  onFeedbackChange: (value: string) => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  busy?: boolean;
  readOnly?: boolean;
  successMessage?: string | null;
  error?: string | null;
  sticky?: boolean;
  variant?: "full" | "feedback-only" | "actions-only";
};

export function EvaluatorReviewActions({
  feedback,
  onFeedbackChange,
  onSaveDraft,
  onSubmit,
  busy = false,
  readOnly = false,
  successMessage,
  error,
  sticky = false,
  variant = "full",
}: Props) {
  const showFeedback = variant === "full" || variant === "feedback-only";
  const showActions = variant === "full" || variant === "actions-only";

  const content = (
    <>
      {showFeedback ? (
        <label className="block">
          <span className="text-sm font-semibold text-navy">
            Feedback to student
          </span>
          <textarea
            value={feedback}
            onChange={(e) => onFeedbackChange(e.target.value)}
            rows={5}
            disabled={readOnly || busy}
            placeholder="Strengths, improvements, and next steps for the student…"
            className={cn(evaluatorTextarea, "mt-2 min-h-[118px]")}
          />
        </label>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {successMessage ? (
        <p className="text-sm font-medium text-emerald-700" role="status">
          {successMessage}
        </p>
      ) : null}

      {showActions && !readOnly ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onSubmit}
            className={cn(evaluatorBtnPrimary, "w-full")}
          >
            {busy ? "Submitting…" : "Submit review"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onSaveDraft}
            className={cn(evaluatorBtnSecondary, "w-full")}
          >
            Save draft
          </button>
        </div>
      ) : null}
    </>
  );

  if (variant === "actions-only") {
    return (
      <div
        className={cn(
          evaluatorCard,
          evaluatorCardPad,
          "space-y-3",
          sticky &&
            "sticky bottom-0 z-10 border-t border-[#EAEEF3] bg-white/95 backdrop-blur-sm",
        )}
      >
        {content}
      </div>
    );
  }

  if (sticky) {
    return (
      <div
        className={cn(
          "space-y-3 border-t border-[#EAEEF3] bg-white/95 px-4 py-4 backdrop-blur-sm",
          "sticky bottom-0 z-20 -mx-4 sm:-mx-0 sm:rounded-2xl sm:border sm:px-5",
        )}
      >
        {content}
      </div>
    );
  }

  return <div className="space-y-3">{content}</div>;
}
