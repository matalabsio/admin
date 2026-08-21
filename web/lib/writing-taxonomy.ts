/** Writing exam-module + Task 1 type taxonomy (admin Phase 3). */

export const WRITING_EXAM_MODULES = [
  "academic",
  "general_training",
  "both",
] as const;

export type WritingExamModule = (typeof WRITING_EXAM_MODULES)[number];

export const WRITING_QUESTION_TYPES = [
  "task1_academic",
  "task1_general",
  "task2",
] as const;

export type WritingQuestionType = (typeof WRITING_QUESTION_TYPES)[number];

export const EXAM_MODULE_LABELS: Record<WritingExamModule, string> = {
  academic: "Academic",
  general_training: "General Training",
  both: "Both",
};

/** ``both`` = valid for Academic AND General Training (not duplicated content). */
export function isWritingExamModule(
  value: unknown,
): value is WritingExamModule {
  return (
    typeof value === "string" &&
    (WRITING_EXAM_MODULES as readonly string[]).includes(value)
  );
}

export function isWritingQuestionType(
  value: unknown,
): value is WritingQuestionType {
  return (
    typeof value === "string" &&
    (WRITING_QUESTION_TYPES as readonly string[]).includes(value)
  );
}

export function writingTaskExamModuleCompatible(
  questionType: string,
  examModule: string | null | undefined,
): boolean {
  if (!isWritingQuestionType(questionType) || !isWritingExamModule(examModule)) {
    return false;
  }
  if (questionType === "task2") return true;
  if (questionType === "task1_academic") {
    return examModule === "academic" || examModule === "both";
  }
  if (questionType === "task1_general") {
    return examModule === "general_training" || examModule === "both";
  }
  return false;
}

export function writingTaxonomyMismatchMessage(
  questionType: string,
  examModule: string | null | undefined,
): string | null {
  if (writingTaskExamModuleCompatible(questionType, examModule)) {
    return null;
  }
  if (!examModule) {
    return "Select an Exam Module before saving.";
  }
  if (questionType === "task1_academic" && examModule === "general_training") {
    return "Academic Task 1 cannot use Exam Module General Training.";
  }
  if (questionType === "task1_general" && examModule === "academic") {
    return "General Training Task 1 cannot use Exam Module Academic.";
  }
  return `Invalid combination: ${questionType} with exam_module ${examModule}.`;
}

export function defaultTask1TypeForExamModule(
  examModule: string | null | undefined,
): "task1_academic" | "task1_general" {
  if (examModule === "general_training") return "task1_general";
  return "task1_academic";
}
