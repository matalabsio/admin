/** Mock UUID/slug resolution — no imports from mock-catalog or mock-catalog-api. */

/** Academic Mock 1 — valid Postgres UUID (a000 prefix; `m` is not hex). */
export const M01_MOCK_TEST_ID = "a0000000-0000-4000-8000-000000000001";

/** Academic Mock 2 — valid Postgres UUID (a000 prefix). */
export const M02_MOCK_TEST_ID = "a0000000-0000-4000-8000-000000000002";

export const MOCK_SLUGS = {
  m01: M01_MOCK_TEST_ID,
  m02: M02_MOCK_TEST_ID,
} as const;

export type MockSlug = keyof typeof MOCK_SLUGS;

export const DEFAULT_MOCK_SLUG: MockSlug = "m01";

export const PUBLISHED_FULL_MOCK_IDS: readonly string[] = [
  M01_MOCK_TEST_ID,
  M02_MOCK_TEST_ID,
];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LEGACY_INVALID_M01_ID = "m0000000-0000-4000-8000-000000000001";

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function resolveMockId(slugOrId: string): string {
  if (slugOrId === LEGACY_INVALID_M01_ID) return M01_MOCK_TEST_ID;
  if (slugOrId in MOCK_SLUGS) {
    return MOCK_SLUGS[slugOrId as MockSlug];
  }
  if (isUuid(slugOrId)) return slugOrId;
  return M01_MOCK_TEST_ID;
}

/** Resolved UUID for API calls from route slug or id. */
export function mockApiId(slugOrId: string): string {
  return resolveMockId(slugOrId);
}

export const DEFAULT_MOCK_TEST_ID = M01_MOCK_TEST_ID;
