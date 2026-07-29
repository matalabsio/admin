/** Module-complete review routes — standalone to avoid mock-catalog circular imports in client bundles. */

function objectiveModuleReviewPath(
  testNumber: number,
  module: "listening" | "reading",
  mockAttemptId?: string | null,
): string {
  const base = `/test/${testNumber}/${module}/review`;
  if (!mockAttemptId) return base;
  const params = new URLSearchParams({ mock_attempt: mockAttemptId });
  return `${base}?${params.toString()}`;
}

function scoredModuleReviewPath(
  testNumber: number,
  module: "writing" | "speaking",
  mockAttemptId?: string | null,
): string {
  const base = `/test/${testNumber}/${module}/review`;
  if (!mockAttemptId) return base;
  return `${base}?${new URLSearchParams({ mock_attempt: mockAttemptId }).toString()}`;
}

export function listeningModuleReviewPath(
  testNumber: number,
  mockAttemptId?: string | null,
): string {
  return objectiveModuleReviewPath(testNumber, "listening", mockAttemptId);
}

export function readingModuleReviewPath(
  testNumber: number,
  mockAttemptId?: string | null,
): string {
  return objectiveModuleReviewPath(testNumber, "reading", mockAttemptId);
}

export function writingModuleReviewPath(
  testNumber: number,
  mockAttemptId?: string | null,
): string {
  return scoredModuleReviewPath(testNumber, "writing", mockAttemptId);
}

export function speakingModuleReviewPath(
  testNumber: number,
  mockAttemptId?: string | null,
): string {
  return scoredModuleReviewPath(testNumber, "speaking", mockAttemptId);
}

/** Full mock aggregate results (after all modules complete). */
export function mockResultsPathForTest(
  testNumber: number,
  mockAttemptId?: string | null,
): string {
  const base = `/test/${testNumber}/results`;
  if (!mockAttemptId) return base;
  return `${base}?${new URLSearchParams({ mock_attempt: mockAttemptId }).toString()}`;
}
