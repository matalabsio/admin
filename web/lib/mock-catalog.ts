import type { MockCatalogApiItem } from "@/lib/mock-catalog-api";
import { isLiveCatalogNumber } from "@/lib/mock-catalog-live";
import { mockResultsPathForTest } from "@/lib/module-review-paths";
import {
  DEFAULT_MOCK_SLUG,
  DEFAULT_MOCK_TEST_ID,
  M01_MOCK_TEST_ID,
  M02_MOCK_TEST_ID,
  MOCK_SLUGS,
  PUBLISHED_FULL_MOCK_IDS,
  isUuid,
  mockApiId,
  resolveMockId,
  type MockSlug,
} from "@/lib/mock-ids";

export {
  DEFAULT_MOCK_SLUG,
  DEFAULT_MOCK_TEST_ID,
  M01_MOCK_TEST_ID,
  M02_MOCK_TEST_ID,
  isUuid,
  mockApiId,
  type MockSlug,
};

/** Published full IELTS mocks (orchestrated multi-module exams). */

/** Slugs shown on the dashboard (in order). */
export const PUBLISHED_MOCK_SLUGS: readonly MockSlug[] = ["m01", "m02"];

/** Full mock test panel — five slots; only available slots are startable. */
export type MockTestPanelSlot = {
  number: 1 | 2 | 3 | 4 | 5;
  slug: MockSlug | null;
  displayLabel: string;
  examTitle: string;
  available: boolean;
};

export const MOCK_TEST_PANEL: readonly MockTestPanelSlot[] = [
  {
    number: 1,
    slug: "m01",
    displayLabel: "Test 1",
    examTitle: "IELTS Academic Mock 1",
    available: true,
  },
  {
    number: 2,
    slug: "m02",
    displayLabel: "Test 2",
    examTitle: "IELTS Academic Mock 2",
    available: true,
  },
  {
    number: 3,
    slug: null,
    displayLabel: "Test 3",
    examTitle: "IELTS Academic Mock 3",
    available: false,
  },
  {
    number: 4,
    slug: null,
    displayLabel: "Test 4",
    examTitle: "IELTS Academic Mock 4",
    available: false,
  },
  {
    number: 5,
    slug: null,
    displayLabel: "Test 5",
    examTitle: "IELTS Academic Mock 5",
    available: false,
  },
];

export function getMockPanelSlot(number: number): MockTestPanelSlot | undefined {
  return MOCK_TEST_PANEL.find((slot) => slot.number === number);
}

export function getMockPanelSlotBySlug(slug: MockSlug): MockTestPanelSlot | undefined {
  return MOCK_TEST_PANEL.find((slot) => slot.slug === slug);
}

export function mockTestIdForNumber(testNumber: number): string {
  const slot = MOCK_TEST_PANEL.find((row) => row.number === testNumber);
  if (slot?.slug) return MOCK_SLUGS[slot.slug];
  return M01_MOCK_TEST_ID;
}

/** Resolve m01/m02 slug from a mock UUID or legacy slug ref. */
export function publishedSlugForMockRef(slugOrId: string): MockSlug | null {
  const id = resolveMockId(slugOrId);
  const slug = mockSlugForId(id);
  if (slug === "m01" || slug === "m02") return slug;
  return null;
}

export function testNumberForMockId(mockTestId: string): number {
  const slug = publishedSlugForMockRef(mockTestId);
  if (slug) {
    const panelSlot = getMockPanelSlotBySlug(slug);
    if (panelSlot) return panelSlot.number;
  }
  return 1;
}

export function shortModuleResultsPath(
  testNumber: number,
  module: "listening" | "reading" | "writing" | "speaking",
): string {
  return `/test/${testNumber}/${module}/results`;
}

export function shortModuleWritingResultsPath(
  testNumber: number,
  attemptId: string,
  opts?: { mockAttemptId?: string | null; part?: number | null },
): string {
  const params = new URLSearchParams({ attempt: attemptId });
  const mockAttemptId = opts?.mockAttemptId?.trim();
  if (mockAttemptId) params.set("mock_attempt", mockAttemptId);
  if (opts?.part != null && Number.isFinite(opts.part) && opts.part >= 1) {
    params.set("part", String(opts.part));
  }
  return `/test/${testNumber}/writing/results?${params.toString()}`;
}

export function writingModuleLabel(part?: number | null): string {
  if (part === 1) return "Writing · Task 1";
  if (part === 2) return "Writing · Task 2";
  return "Writing";
}

export function shortModuleSpeakingPendingPath(
  testNumber: number,
  attemptId: string,
  opts?: { mockAttemptId?: string | null },
): string {
  const params = new URLSearchParams({ attempt: attemptId });
  const mockAttemptId = opts?.mockAttemptId?.trim();
  if (mockAttemptId) params.set("mock_attempt", mockAttemptId);
  return `/test/${testNumber}/speaking/pending?${params.toString()}`;
}

export function shortModuleWritingPendingPath(
  testNumber: number,
  attemptId: string,
): string {
  const params = new URLSearchParams({ attempt: attemptId });
  return `/test/${testNumber}/writing/pending?${params.toString()}`;
}

/** Active exam module — `/test/1/listening?part=2` (no transient flags in URL). */
export function shortModuleExamPath(
  testNumber: number,
  module: "listening" | "reading" | "writing" | "speaking",
  opts?: { part?: number; passage?: number },
): string {
  const base = `/test/${testNumber}/${module}`;
  const params = new URLSearchParams();
  if (module === "listening") {
    const part = opts?.part ?? 1;
    if (part !== 1) params.set("part", String(part));
  }
  if (module === "reading") {
    const passage = opts?.passage ?? opts?.part ?? 1;
    if (passage !== 1) params.set("passage", String(passage));
  }
  if (module === "writing") {
    const part = opts?.part ?? 1;
    if (part !== 1) params.set("part", String(part));
  }
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

export function isLiveCatalogTestNumber(testNumber: number): boolean {
  return isLiveCatalogNumber(testNumber);
}

export {
  listeningModuleReviewPath,
  readingModuleReviewPath,
  speakingModuleReviewPath,
  writingModuleReviewPath,
} from "@/lib/module-review-paths";

/** One-hop legacy redirect URL (hydrator strips transient query params). */
export function legacyModuleExamRedirectPath(
  testNumber: number,
  module: "listening" | "reading" | "writing" | "speaking",
  sp?: {
    part?: number;
    passage?: number;
    auto?: boolean;
    sectionStart?: boolean;
    mockAttemptId?: string;
  },
): string {
  const path = shortModuleExamPath(testNumber, module, {
    part: sp?.part,
    passage: sp?.passage,
  });
  if (!sp) return path;
  const params = new URLSearchParams();
  if (sp.auto) params.set("auto", "1");
  if (sp.sectionStart) params.set("section_start", "1");
  if (sp.mockAttemptId) params.set("mock_attempt", sp.mockAttemptId);
  const extra = params.toString();
  if (!extra) return path;
  return path.includes("?") ? `${path}&${extra}` : `${path}?${extra}`;
}

export function mockTestsIndexPath(): string {
  return "/test";
}

export function mockTestNumberPath(
  number: number,
  _mockAttemptId?: string | null,
): string {
  return `/test?test=${number}`;
}

export type MockMeta = {
  slug: MockSlug | string;
  id: string;
  displayLabel: string;
  subtitle: string;
  flowHint: string;
  listeningPartCount: number;
  readingPassageCount: number;
  writingTaskCount: number;
  listeningMinutes: number;
  readingMinutes: number;
  writingMinutes: number;
  speakingMinutes?: number;
  totalMinutes: number;
};

const DEFAULT_SECTION_COUNTS = {
  listeningPartCount: 4,
  readingPassageCount: 2,
  writingTaskCount: 2,
  listeningMinutes: 30,
  readingMinutes: 30,
  writingMinutes: 60,
  speakingMinutes: 0,
};

type SectionCountOverrides = Partial<typeof DEFAULT_SECTION_COUNTS>;

function buildMockMeta(
  slug: MockSlug,
  displayLabel: string,
  subtitle: string,
  flowHint: string,
  overrides: SectionCountOverrides = {},
): MockMeta {
  const c = { ...DEFAULT_SECTION_COUNTS, ...overrides };
  return {
    slug,
    id: MOCK_SLUGS[slug],
    displayLabel,
    subtitle,
    flowHint,
    ...c,
    totalMinutes:
      c.listeningMinutes +
      c.readingMinutes +
      c.writingMinutes +
      (c.speakingMinutes ?? 0),
  };
}

const LEGACY_INVALID_M01_ID = "m0000000-0000-4000-8000-000000000001";

export type MockModule = "reading" | "listening" | "writing" | "speaking";

function mockSlugForId(id: string): MockSlug | string {
  if (id === LEGACY_INVALID_M01_ID) return DEFAULT_MOCK_SLUG;
  for (const [slug, uuid] of Object.entries(MOCK_SLUGS) as [MockSlug, string][]) {
    if (uuid === id) return slug;
  }
  return id;
}

export function canonicalMockSlug(slugOrId: string): string {
  if (isUuid(slugOrId)) return slugOrId;
  const resolved = resolveMockId(slugOrId);
  const slug = mockSlugForId(resolved);
  if (typeof slug === "string" && slug in MOCK_SLUGS) return slug;
  if (isUuid(resolved)) return resolved;
  return DEFAULT_MOCK_SLUG;
}

export function isFullMock(testId: string): boolean {
  return PUBLISHED_FULL_MOCK_IDS.includes(resolveMockId(testId));
}

/** Canonical hub for a published mock — section cards (Listening, Reading, Writing). */
export function testHubPath(
  slugOrId: string = DEFAULT_MOCK_SLUG,
  _mockAttemptId?: string | null,
  catalogNumber?: number | null,
): string {
  if (catalogNumber != null && catalogNumber >= 1) {
    return mockTestNumberPath(catalogNumber);
  }
  const slug = publishedSlugForMockRef(slugOrId);
  if (slug) {
    const slot = getMockPanelSlotBySlug(slug);
    if (slot) return mockTestNumberPath(slot.number);
  }
  return mockTestNumberPath(1);
}

/** Canonical Test 1 hub — section cards (Listening, Reading, Writing). */
export function test1HubPath(mockAttemptId?: string | null): string {
  return testHubPath("m01", mockAttemptId);
}

/** Canonical Test 2 hub. */
export function test2HubPath(mockAttemptId?: string | null): string {
  return testHubPath("m02", mockAttemptId);
}

export function mockHubPath(
  slug: string = DEFAULT_MOCK_SLUG,
  _mockAttemptId?: string | null,
): string {
  const published = publishedSlugForMockRef(slug);
  if (published) {
    return testHubPath(published);
  }
  return `/mock/${canonicalMockSlug(slug)}`;
}

function buildFallbackMockMeta(id: string, slug: string): MockMeta {
  const c = { ...DEFAULT_SECTION_COUNTS };
  return {
    slug,
    id,
    displayLabel: "Mock test",
    subtitle: "Full IELTS Academic mock",
    flowHint: `Listening has ${c.listeningPartCount} parts · reading has ${c.readingPassageCount} passages · writing has ${c.writingTaskCount} tasks`,
    ...c,
    totalMinutes: c.listeningMinutes + c.readingMinutes + c.writingMinutes,
  };
}

/** Build UI meta from a live catalog API row (admin-created mocks). */
export function mockMetaFromCatalogItem(item: MockCatalogApiItem): MockMeta {
  const number = item.catalog_number;
  const displayLabel = number != null ? `Test ${number}` : item.title;
  const listeningPartCount =
    item.listening_parts || DEFAULT_SECTION_COUNTS.listeningPartCount;
  const readingPassageCount =
    item.reading_passages || DEFAULT_SECTION_COUNTS.readingPassageCount;
  const writingTaskCount =
    item.writing_tasks || DEFAULT_SECTION_COUNTS.writingTaskCount;
  const listeningMinutes = DEFAULT_SECTION_COUNTS.listeningMinutes;
  const readingMinutes = DEFAULT_SECTION_COUNTS.readingMinutes;
  const writingMinutes = DEFAULT_SECTION_COUNTS.writingMinutes;
  return {
    slug: item.id,
    id: item.id,
    displayLabel,
    subtitle: item.description ?? displayLabel,
    flowHint: `Listening has ${listeningPartCount} parts · reading has ${readingPassageCount} passages · writing has ${writingTaskCount} tasks`,
    listeningPartCount,
    readingPassageCount,
    writingTaskCount,
    listeningMinutes,
    readingMinutes,
    writingMinutes,
    totalMinutes: listeningMinutes + readingMinutes + writingMinutes,
  };
}

export function resolveMockMetaFromCatalog(
  catalog: MockCatalogApiItem[],
  slugOrId: string,
): MockMeta {
  const id = resolveMockId(slugOrId);
  const item = catalog.find((row) => row.id === id);
  if (item) return mockMetaFromCatalogItem(item);
  return getMockMeta(slugOrId);
}

export function getMockMeta(slugOrId: string): MockMeta {
  const published = publishedSlugForMockRef(slugOrId);
  if (published) {
    return MOCK_CATALOG[published];
  }
  const slug = canonicalMockSlug(slugOrId);
  if (slug in MOCK_CATALOG) {
    return MOCK_CATALOG[slug as MockSlug];
  }
  const id = resolveMockId(slugOrId);
  return buildFallbackMockMeta(id, slug);
}

export function mockModulePath(
  slugOrId: string,
  module: MockModule,
  opts?: { part?: number; passage?: number; auto?: boolean; mockAttemptId?: string },
): string {
  const id = resolveMockId(slugOrId);
  const testNumber = testNumberForMockId(id);
  if (
    isLiveCatalogNumber(testNumber) &&
    (module === "listening" ||
      module === "reading" ||
      module === "writing" ||
      module === "speaking")
  ) {
    return shortModuleExamPath(testNumber, module, {
      part: opts?.part,
      passage: opts?.passage,
    });
  }

  const slug = canonicalMockSlug(slugOrId);
  const base = `/mock/${slug}/${module}`;
  const params = new URLSearchParams();
  if (module === "listening" && opts?.part) {
    params.set("part", String(opts.part));
  }
  if (module === "reading") {
    const passage = opts?.passage ?? opts?.part ?? 1;
    params.set("passage", String(passage));
  }
  if (module === "writing" && opts?.part) {
    params.set("part", String(opts.part));
  }
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

export function mockCheckpointPath(
  slugOrId: string,
  opts: { mockAttemptId: string; attempt: string; from?: "reading" | "listening" },
): string {
  const slug = canonicalMockSlug(slugOrId);
  const params = new URLSearchParams({
    mock_attempt: opts.mockAttemptId,
    attempt: opts.attempt,
  });
  if (opts.from) params.set("from", opts.from);
  return `/mock/${slug}/checkpoint?${params.toString()}`;
}

export function mockResultsPath(
  slugOrId: string,
  mockAttemptId?: string | null,
): string {
  const id = resolveMockId(slugOrId);
  const testNumber = testNumberForMockId(id);
  if (isLiveCatalogNumber(testNumber)) {
    return mockResultsPathForTest(testNumber, mockAttemptId);
  }
  const slug = canonicalMockSlug(slugOrId);
  const base = `/mock/${slug}/results`;
  if (!mockAttemptId) return base;
  return `${base}?${new URLSearchParams({ mock_attempt: mockAttemptId }).toString()}`;
}

/** Listening parts included in Test 1 flow. */
export const TEST1_LISTENING_PART_COUNT = 4;

/** Reading passages in Test 1 quick flow. */
export const TEST1_READING_PASSAGE_COUNT = 2;

/** Writing tasks in Test 1 quick flow. */
export const TEST1_WRITING_TASK_COUNT = 2;

/**
 * Where to go after finishing a section inside a full mock (Test 1).
 * Listening parts 1–3 → next part; part 4 → Reading passage 1;
 * Reading passages 1–3 → next passage; passage 4 → /scores.
 */
export function mockAfterSectionSubmitPath(
  slugOrId: string,
  _mockAttemptId: string,
  completedModule: "reading" | "listening",
  opts?: {
    nextPart?: number;
    completedPart?: number;
    attemptId?: string;
  },
): string {
  if (completedModule === "listening") {
    const finishedPart = opts?.completedPart ?? TEST1_LISTENING_PART_COUNT;
    if (finishedPart < TEST1_LISTENING_PART_COUNT) {
      return mockModulePath(slugOrId, "listening", {
        part: finishedPart + 1,
      });
    }
    return mockModulePath(slugOrId, "reading", {
      passage: opts?.nextPart ?? 1,
    });
  }

  const readingPassageCount = getMockMeta(slugOrId).readingPassageCount;
  const finishedPassage = opts?.completedPart ?? readingPassageCount;
  if (finishedPassage < readingPassageCount) {
    return mockModulePath(slugOrId, "reading", {
      passage: finishedPassage + 1,
    });
  }
  return mockModulePath(slugOrId, "writing", {
    part: 1,
  });
}

/** After a writing task submit inside a full mock. */
export function mockAfterWritingSubmitPath(
  slugOrId: string,
  mockAttemptId: string,
  completedPart: number,
  progress: {
    status?: string;
    next_module?: string | null;
    next_part?: number | null;
  },
  attemptId: string,
): string {
  if (progress.status === "completed") {
    return mockResultsPath(slugOrId, mockAttemptId);
  }
  if (
    progress.next_module === "writing" &&
    progress.next_part === 2 &&
    completedPart === 1 &&
    TEST1_WRITING_TASK_COUNT > 1
  ) {
    return mockModulePath(slugOrId, "writing", {
      part: 2,
    });
  }
  if (progress.next_module) {
    return mockPathFromProgress(slugOrId, mockAttemptId, progress);
  }
  return mockHubPath(slugOrId, mockAttemptId);
}

/** Navigate after submit using orchestrator progress (respects listening → reading order). */
export function mockPathFromProgress(
  slugOrId: string,
  mockAttemptId: string,
  progress: {
    status?: string;
    next_module?: string | null;
    next_part?: number | null;
  },
  _attemptId?: string,
): string {
  if (progress.status === "completed") {
    return mockResultsPath(slugOrId, mockAttemptId);
  }
  const mod = progress.next_module;
  if (
    mod === "listening" ||
    mod === "reading" ||
    mod === "writing" ||
    mod === "speaking"
  ) {
    return mockModulePath(slugOrId, mod, {
      part:
        mod === "listening" || mod === "writing" || mod === "speaking"
          ? (progress.next_part ?? 1)
          : undefined,
      passage: mod === "reading" ? (progress.next_part ?? 1) : undefined,
    });
  }
  return mockHubPath(slugOrId);
}

/** Route to open right after POST /api/mock-attempts (start / new attempt). */
export function examPathForMockStart(
  slugOrId: string,
  res: {
    mock_attempt_id: string;
    current_module: string;
    part?: number | null;
  },
): string {
  const raw = res.current_module;
  const mod: MockModule =
    raw === "reading" ||
    raw === "writing" ||
    raw === "listening" ||
    raw === "speaking"
      ? raw
      : "listening";
  return mockModulePath(slugOrId, mod, {
    part:
      mod === "listening" || mod === "writing" || mod === "speaking"
        ? (res.part ?? 1)
        : undefined,
    passage: mod === "reading" ? (res.part ?? 1) : undefined,
  });
}

/** If the user is on the wrong section URL, return the correct exam path. */
export function examRedirectIfMismatch(
  slugOrId: string,
  mockAttemptId: string,
  current: { module: "reading" | "listening" | "writing" | "speaking"; part: number },
  progress: {
    status?: string;
    next_module?: string | null;
    next_part?: number | null;
  },
): string | null {
  if (progress.status === "completed") {
    return mockResultsPath(slugOrId, mockAttemptId);
  }
  const expectedMod = progress.next_module;
  if (
    expectedMod !== "reading" &&
    expectedMod !== "listening" &&
    expectedMod !== "writing" &&
    expectedMod !== "speaking"
  ) {
    return null;
  }
  const expectedPart = progress.next_part ?? 1;
  if (expectedMod === current.module && expectedPart === current.part) {
    return null;
  }
  return mockPathFromProgress(slugOrId, mockAttemptId, {
    next_module: expectedMod,
    next_part: expectedPart,
  });
}

/** User-facing label (UI only; routes/API stay mock/m01). */
export const MOCK_DISPLAY_LABEL = "Test 1";
export const MOCK_DISPLAY_SUBTITLE =
  "Test 1 — Listening (Parts 1-4 · 30 min) → Reading (Passages 1-2 · 30 min) → Writing (Tasks 1-2 · 60 min) → Speaking Part 1 (24h review) → Score";
export const MOCK_DISPLAY_FLOW_HINT =
  "Listening has 4 parts · reading has 2 passages · writing has 2 tasks · speaking Part 1 · submit each section to unlock the next";

export const MOCK2_DISPLAY_LABEL = "Test 2";
export const MOCK2_DISPLAY_SUBTITLE =
  "Test 2 — Listening (Parts 1-4 · 30 min) → Reading (Passages 1-3 · 30 min) → Writing (Tasks 1-2 · 60 min) → Speaking Parts 1–3 → Score";
export const MOCK2_DISPLAY_FLOW_HINT =
  "Listening has 4 parts · reading has 3 passages · writing has 2 tasks · speaking Parts 1–3 · same evaluation flow as Test 1";

export const MOCK_CATALOG: Record<MockSlug, MockMeta> = {
  m01: buildMockMeta(
    "m01",
    MOCK_DISPLAY_LABEL,
    MOCK_DISPLAY_SUBTITLE,
    MOCK_DISPLAY_FLOW_HINT,
    { speakingMinutes: 14 },
  ),
  m02: buildMockMeta(
    "m02",
    MOCK2_DISPLAY_LABEL,
    MOCK2_DISPLAY_SUBTITLE,
    MOCK2_DISPLAY_FLOW_HINT,
    { readingPassageCount: 3, speakingMinutes: 14 },
  ),
};

/** Per-section limits for Test 1 (matches MODULE_LIVE_PARTS). */
export const TEST1_LISTENING_MINUTES = 30;
export const TEST1_READING_MINUTES = 30;
export const TEST1_WRITING_MINUTES = 60;
export const TEST1_SPEAKING_MINUTES = 14;
export const TEST1_TOTAL_MINUTES =
  TEST1_LISTENING_MINUTES +
  TEST1_READING_MINUTES +
  TEST1_WRITING_MINUTES +
  TEST1_SPEAKING_MINUTES;
