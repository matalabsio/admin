/** Live catalog slot limits — shared by mock-catalog and mock-catalog-api without circular imports. */

/** Max catalog_number accepted as a live student slot (matches admin create/update le=20). */
export const MAX_LIVE_CATALOG_NUMBER = 20;

export function isLiveCatalogNumber(catalogNumber: number): boolean {
  return catalogNumber >= 1 && catalogNumber <= MAX_LIVE_CATALOG_NUMBER;
}
