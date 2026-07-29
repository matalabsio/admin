/** Live full-mock catalog from the API (admin-created tests included). */

import { mockApiId } from "@/lib/mock-ids";
import {
  isLiveCatalogNumber,
  MAX_LIVE_CATALOG_NUMBER,
} from "@/lib/mock-catalog-live";

export { isLiveCatalogNumber, MAX_LIVE_CATALOG_NUMBER };

export type MockCatalogApiItem = {
  id: string;
  title: string;
  description: string | null;
  catalog_number: number | null;
  modules_enabled: string[];
  listening_parts: number;
  reading_passages: number;
  writing_tasks: number;
};

export type MockCatalogSlot = {
  number: number;
  id: string;
  title: string;
  displayLabel: string;
  examTitle: string;
  available: boolean;
  modulesEnabled: string[];
  listeningPartCount: number;
  readingPassageCount: number;
  writingTaskCount: number;
  listeningMinutes: number;
  readingMinutes: number;
  writingMinutes: number;
  totalMinutes: number;
  flowHint: string;
  /** Test 2+ requires an active subscription. */
  requiresSubscription?: boolean;
};

export function catalogItemToSlot(item: MockCatalogApiItem): MockCatalogSlot {
  const number = item.catalog_number ?? 0;
  const listeningMinutes = 30;
  const readingMinutes = 30;
  const writingMinutes = 60;
  return {
    number,
    id: item.id,
    title: item.title,
    displayLabel: `Test ${number}`,
    examTitle: item.title,
    available: isLiveCatalogNumber(number),
    modulesEnabled: item.modules_enabled ?? [],
    listeningPartCount: item.listening_parts || 4,
    readingPassageCount: item.reading_passages || 2,
    writingTaskCount: item.writing_tasks || 2,
    listeningMinutes,
    readingMinutes,
    writingMinutes,
    totalMinutes: listeningMinutes + readingMinutes + writingMinutes,
    flowHint: `Listening has ${item.listening_parts || 4} parts · reading has ${item.reading_passages || 2} passages · writing has ${item.writing_tasks || 2} tasks`,
    requiresSubscription: number >= 2,
  };
}

/** Placeholder for upcoming tests (no section counts or content metadata). */
function upcomingCatalogSlot(number: number): MockCatalogSlot {
  return {
    number,
    id: "",
    title: `IELTS Academic Mock ${number}`,
    displayLabel: `Test ${number}`,
    examTitle: `IELTS Academic Mock ${number}`,
    available: false,
    modulesEnabled: [],
    listeningPartCount: 0,
    readingPassageCount: 0,
    writingTaskCount: 0,
    listeningMinutes: 0,
    readingMinutes: 0,
    writingMinutes: 0,
    totalMinutes: 0,
    flowHint: "",
    requiresSubscription: false,
  };
}

/** Placeholder slots up to 5 tests (matches legacy panel size). */
export function buildCatalogPanel(
  live: MockCatalogApiItem[],
  maxSlots = 5,
): MockCatalogSlot[] {
  const byNumber = new Map(
    live
      .filter(
        (item) =>
          item.catalog_number != null &&
          isLiveCatalogNumber(item.catalog_number as number),
      )
      .map((item) => [item.catalog_number as number, catalogItemToSlot(item)]),
  );

  const slots: MockCatalogSlot[] = [];
  for (let n = 1; n <= maxSlots; n += 1) {
    const existing = byNumber.get(n);
    if (existing) {
      slots.push(existing);
      continue;
    }
    slots.push(upcomingCatalogSlot(n));
  }
  return slots;
}

export function slotByNumber(
  panel: MockCatalogSlot[],
  number: number,
): MockCatalogSlot | undefined {
  return panel.find((slot) => slot.number === number);
}

/** Resolve catalog slot number (1–5) for a mock UUID or legacy slug (m01/m02). */
export function catalogNumberForMockId(
  panel: MockCatalogSlot[],
  slugOrId: string,
): number | null {
  const id = mockApiId(slugOrId);
  const byId = panel.find((slot) => slot.available && slot.id === id);
  if (byId) return byId.number;

  return null;
}

export function liveCatalogSlots(panel: MockCatalogSlot[]): MockCatalogSlot[] {
  return panel.filter((slot) => slot.available && Boolean(slot.id));
}

/** First live catalog slot number, or 1 when none are published yet. */
export function defaultCatalogTestNumber(panel: MockCatalogSlot[]): number {
  const firstLive = panel.find((slot) => slot.available && Boolean(slot.id));
  return firstLive?.number ?? 1;
}

/** Human-readable list of live tests for empty-state copy. */
export function liveTestLabels(panel: MockCatalogSlot[]): string {
  const live = liveCatalogSlots(panel);
  if (live.length === 0) return "a live test";
  if (live.length === 1) return live[0]!.displayLabel;
  if (live.length === 2) return `${live[0]!.displayLabel} or ${live[1]!.displayLabel}`;
  const head = live
    .slice(0, -1)
    .map((slot) => slot.displayLabel)
    .join(", ");
  return `${head}, or ${live[live.length - 1]!.displayLabel}`;
}
