import type { MockTestSummary } from "@/components/bandforge/dashboard/types";
import {
  M01_MOCK_TEST_ID,
  M02_MOCK_TEST_ID,
  PUBLISHED_MOCK_SLUGS,
  getMockMeta,
} from "@/lib/mock-catalog";

/** Shown when /api/tests/mock-tests is empty or unavailable (e.g. migrations pending). */
export const M01_MOCK_FALLBACK: MockTestSummary = {
  id: M01_MOCK_TEST_ID,
  title: "IELTS Academic Mock 1",
  description:
    "Reading (13 questions) → Listening (4 parts, 40 questions). Writing and Speaking coming soon.",
  listening_question_count: 40,
  listening_duration_minutes: 30,
  reading_question_count: 13,
  reading_duration_minutes: 20,
};

export const M02_MOCK_FALLBACK: MockTestSummary = {
  id: M02_MOCK_TEST_ID,
  title: "IELTS Academic Mock 2",
  description:
    "Listening (4 parts, 40 questions, 30 min) → Reading (3 passages, 30 min) → Writing (2 tasks, 60 min).",
  listening_question_count: 40,
  listening_duration_minutes: 30,
  reading_question_count: 40,
  reading_duration_minutes: 30,
};

const FALLBACK_BY_ID: Record<string, MockTestSummary> = {
  [M01_MOCK_TEST_ID]: M01_MOCK_FALLBACK,
  [M02_MOCK_TEST_ID]: M02_MOCK_FALLBACK,
};

export function resolveDashboardMockTests(
  fromApi: MockTestSummary[],
): MockTestSummary[] {
  const byId = new Map(fromApi.map((row) => [row.id, row]));
  return PUBLISHED_MOCK_SLUGS.map((slug) => {
    const id = getMockMeta(slug).id;
    return byId.get(id) ?? FALLBACK_BY_ID[id];
  });
}

export function dashboardMockSummary(
  slug: (typeof PUBLISHED_MOCK_SLUGS)[number],
  fromApi: MockTestSummary[],
): MockTestSummary {
  const id = getMockMeta(slug).id;
  return fromApi.find((row) => row.id === id) ?? FALLBACK_BY_ID[id];
}
