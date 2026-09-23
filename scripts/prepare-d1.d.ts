export function cleanDatabaseId(id: unknown): string | null;
export function isValidUuid(id: unknown): boolean;
export function isPlaceholder(id: unknown): boolean;

export interface SyncD1Result {
  success: boolean;
  updated?: boolean;
  databaseId?: string | null;
  reason?: string;
}

export function syncD1Config(customWranglerPath?: string, envVar?: string): SyncD1Result;
