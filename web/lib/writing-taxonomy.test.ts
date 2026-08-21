/**
 * Phase 3 admin Writing taxonomy — unit + lightweight UI contract tests.
 *
 * Run: cd admin/web && npx --yes vitest run lib/writing-taxonomy.test.ts
 */
import { describe, expect, it } from "vitest";
import {
  EXAM_MODULE_LABELS,
  WRITING_EXAM_MODULES,
  defaultTask1TypeForExamModule,
  isWritingExamModule,
  writingTaskExamModuleCompatible,
  writingTaxonomyMismatchMessage,
} from "./writing-taxonomy";

describe("Exam Module selector contract", () => {
  it("exposes Academic, General Training, and Both", () => {
    expect(WRITING_EXAM_MODULES).toEqual([
      "academic",
      "general_training",
      "both",
    ]);
    expect(EXAM_MODULE_LABELS.academic).toBe("Academic");
    expect(EXAM_MODULE_LABELS.general_training).toBe("General Training");
    expect(EXAM_MODULE_LABELS.both).toBe("Both");
  });

  it("accepts selecting Academic", () => {
    expect(isWritingExamModule("academic")).toBe(true);
  });

  it("accepts selecting General Training", () => {
    expect(isWritingExamModule("general_training")).toBe(true);
  });

  it("accepts selecting Both", () => {
    expect(isWritingExamModule("both")).toBe(true);
  });

  it("rejects invalid exam modules", () => {
    expect(isWritingExamModule("foundation")).toBe(false);
    expect(isWritingExamModule(null)).toBe(false);
  });
});

describe("Task 1 Academic vs General Training paths", () => {
  it("Academic Task 1 path is chart-capable (compatible with academic/both)", () => {
    expect(
      writingTaskExamModuleCompatible("task1_academic", "academic"),
    ).toBe(true);
    expect(writingTaskExamModuleCompatible("task1_academic", "both")).toBe(
      true,
    );
  });

  it("General Training Task 1 path is letter (compatible with GT/both)", () => {
    expect(
      writingTaskExamModuleCompatible("task1_general", "general_training"),
    ).toBe(true);
    expect(writingTaskExamModuleCompatible("task1_general", "both")).toBe(
      true,
    );
  });

  it("Task 1 General does not require chart — taxonomy allows prompt-only", () => {
    // Compatibility does not depend on image/chart payload.
    expect(
      writingTaskExamModuleCompatible("task1_general", "general_training"),
    ).toBe(true);
    expect(
      writingTaxonomyMismatchMessage("task1_general", "general_training"),
    ).toBeNull();
  });

  it("defaults Task 1 type from exam module", () => {
    expect(defaultTask1TypeForExamModule("general_training")).toBe(
      "task1_general",
    );
    expect(defaultTask1TypeForExamModule("academic")).toBe("task1_academic");
    expect(defaultTask1TypeForExamModule("both")).toBe("task1_academic");
  });
});

describe("Invalid Academic / GT combinations", () => {
  it("rejects Academic exam_module + task1_general", () => {
    expect(
      writingTaskExamModuleCompatible("task1_general", "academic"),
    ).toBe(false);
    expect(
      writingTaxonomyMismatchMessage("task1_general", "academic"),
    ).toMatch(/cannot use Exam Module Academic/i);
  });

  it("rejects General Training exam_module + task1_academic", () => {
    expect(
      writingTaskExamModuleCompatible("task1_academic", "general_training"),
    ).toBe(false);
    expect(
      writingTaxonomyMismatchMessage("task1_academic", "general_training"),
    ).toMatch(/cannot use Exam Module General Training/i);
  });
});

describe("Existing Academic builder remains functional", () => {
  it("task1_academic + academic remains valid", () => {
    expect(
      writingTaskExamModuleCompatible("task1_academic", "academic"),
    ).toBe(true);
    expect(
      writingTaxonomyMismatchMessage("task1_academic", "academic"),
    ).toBeNull();
  });

  it("task2 + both remains valid (shared essay)", () => {
    expect(writingTaskExamModuleCompatible("task2", "both")).toBe(true);
    expect(writingTaskExamModuleCompatible("task2", "academic")).toBe(true);
    expect(
      writingTaskExamModuleCompatible("task2", "general_training"),
    ).toBe(true);
  });
});

describe("Phase 4A mock Exam Module options (shared taxonomy)", () => {
  it("exposes Academic, General Training, and Both for mock tagging", () => {
    expect(WRITING_EXAM_MODULES).toContain("academic");
    expect(WRITING_EXAM_MODULES).toContain("general_training");
    expect(WRITING_EXAM_MODULES).toContain("both");
  });

  it("edit can switch existing Academic value to GT or Both", () => {
    expect(isWritingExamModule("academic")).toBe(true);
    expect(isWritingExamModule("general_training")).toBe(true);
    expect(isWritingExamModule("both")).toBe(true);
  });

  it("rejects invalid mock exam_module strings", () => {
    expect(isWritingExamModule("GT")).toBe(false);
    expect(isWritingExamModule("Academic")).toBe(false);
  });
});
