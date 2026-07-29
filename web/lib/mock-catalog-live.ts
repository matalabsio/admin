/** Live catalog slot limits — shared by mock-catalog and mock-catalog-api without circular imports. */

export const MAX_LIVE_CATALOG_NUMBER = 2;

export function isLiveCatalogNumber(catalogNumber: number): boolean {
  return catalogNumber >= 1 && catalogNumber <= MAX_LIVE_CATALOG_NUMBER;
}
