export interface Syncable { id: string; updatedAt: string; deletedAt: string | null }
export function mergeRow<T extends Syncable>(existing: T | undefined, incoming: T): T {
  if (!existing) return incoming;
  return incoming.updatedAt >= existing.updatedAt ? incoming : existing;
}
