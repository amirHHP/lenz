import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { 
  syncD1Config, 
  cleanDatabaseId, 
  isValidUuid, 
  isPlaceholder 
} from '../../scripts/prepare-d1.js';

describe('prepare-d1 helper functions', () => {
  it('cleanDatabaseId trims whitespace and removes wrapping quotes', () => {
    expect(cleanDatabaseId('   b592b0fa-d2cf-4b77-94a5-1c7b80e8e452   ')).toBe('b592b0fa-d2cf-4b77-94a5-1c7b80e8e452');
    expect(cleanDatabaseId('"b592b0fa-d2cf-4b77-94a5-1c7b80e8e452"')).toBe('b592b0fa-d2cf-4b77-94a5-1c7b80e8e452');
    expect(cleanDatabaseId("'b592b0fa-d2cf-4b77-94a5-1c7b80e8e452'")).toBe('b592b0fa-d2cf-4b77-94a5-1c7b80e8e452');
    expect(cleanDatabaseId('""')).toBeNull();
    expect(cleanDatabaseId('   "   "   ')).toBeNull();
    expect(cleanDatabaseId('""b592b0fa-d2cf-4b77-94a5-1c7b80e8e452""')).toBe('b592b0fa-d2cf-4b77-94a5-1c7b80e8e452');
    expect(cleanDatabaseId('\'"b592b0fa-d2cf-4b77-94a5-1c7b80e8e452"\'')).toBe('b592b0fa-d2cf-4b77-94a5-1c7b80e8e452');
    expect(cleanDatabaseId(null)).toBeNull();
    expect(cleanDatabaseId(undefined)).toBeNull();
  });

  it('isValidUuid correctly validates standard UUIDs', () => {
    expect(isValidUuid('b592b0fa-d2cf-4b77-94a5-1c7b80e8e452')).toBe(true);
    expect(isValidUuid('B592B0FA-D2CF-4B77-94A5-1C7B80E8E452')).toBe(true);
    expect(isValidUuid('lenz-db')).toBe(false);
    expect(isValidUuid('lenz-db-local')).toBe(false);
    expect(isValidUuid('12345')).toBe(false);
  });

  it('isPlaceholder identifies placeholder strings', () => {
    expect(isPlaceholder('lenz-db-local')).toBe(true);
    expect(isPlaceholder('<PASTE_YOUR_D1_UUID_HERE>')).toBe(true);
    expect(isPlaceholder('placeholder')).toBe(true);
    expect(isPlaceholder('TODO')).toBe(true);
    expect(isPlaceholder('')).toBe(true);
    expect(isPlaceholder('dummy-db-id')).toBe(true);
    expect(isPlaceholder('00000000-0000-0000-0000-000000000000')).toBe(true);
    expect(isPlaceholder('b592b0fa-d2cf-4b77-94a5-1c7b80e8e452')).toBe(false);
  });
});

describe('prepare-d1 syncD1Config', () => {
  let tempDir: string;
  let tempWranglerPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lenz-test-'));
    tempWranglerPath = path.join(tempDir, 'wrangler.toml');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('updates database_id when environment variable is provided and strips quotes', () => {
    const initialConfig = `name = "lenz"
main = "worker/index.ts"

[[d1_databases]]
binding = "DB"
database_name = "lenz-db"
database_id = "lenz-db-local"
`;
    fs.writeFileSync(tempWranglerPath, initialConfig, 'utf-8');

    const testUuid = '"b592b0fa-d2cf-4b77-94a5-1c7b80e8e452"';
    const result = syncD1Config(tempWranglerPath, testUuid);

    expect(result.success).toBe(true);
    expect(result.updated).toBe(true);
    expect(result.databaseId).toBe('b592b0fa-d2cf-4b77-94a5-1c7b80e8e452');

    const updated = fs.readFileSync(tempWranglerPath, 'utf-8');
    expect(updated).toContain('database_id = "b592b0fa-d2cf-4b77-94a5-1c7b80e8e452"');
    expect(updated).not.toContain('""b592b0fa');
    expect(updated).not.toContain('lenz-db-local');
  });

  it('uncomments and updates database_id when previously commented out', () => {
    const initialConfig = `name = "lenz"
[[d1_databases]]
binding = "DB"
database_name = "lenz-db"
# database_id = "placeholder"
`;
    fs.writeFileSync(tempWranglerPath, initialConfig, 'utf-8');

    const testUuid = 'b592b0fa-d2cf-4b77-94a5-1c7b80e8e452';
    const result = syncD1Config(tempWranglerPath, testUuid);

    expect(result.success).toBe(true);
    expect(result.updated).toBe(true);

    const updated = fs.readFileSync(tempWranglerPath, 'utf-8');
    expect(updated).toContain('database_id = "b592b0fa-d2cf-4b77-94a5-1c7b80e8e452"');
    expect(updated).not.toContain('# database_id');
  });

  it('inserts database_id into [[d1_databases]] section if completely missing', () => {
    const initialConfig = `name = "lenz"
[[d1_databases]]
binding = "DB"
database_name = "lenz-db"
`;
    fs.writeFileSync(tempWranglerPath, initialConfig, 'utf-8');

    const testUuid = 'b592b0fa-d2cf-4b77-94a5-1c7b80e8e452';
    const result = syncD1Config(tempWranglerPath, testUuid);

    expect(result.success).toBe(true);
    expect(result.updated).toBe(true);

    const updated = fs.readFileSync(tempWranglerPath, 'utf-8');
    expect(updated).toContain('database_id = "b592b0fa-d2cf-4b77-94a5-1c7b80e8e452"');
  });

  it('safely comments out placeholder database_id (lenz-db-local) when no env var is given', () => {
    const initialConfig = `name = "lenz"
[[d1_databases]]
binding = "DB"
database_name = "lenz-db"
database_id = "lenz-db-local"
`;
    fs.writeFileSync(tempWranglerPath, initialConfig, 'utf-8');

    const result = syncD1Config(tempWranglerPath, '');

    expect(result.success).toBe(true);
    expect(result.updated).toBe(true);
    expect(result.reason).toBe('placeholder_commented');

    const updated = fs.readFileSync(tempWranglerPath, 'utf-8');
    expect(updated).not.toMatch(/^[ \t]*database_id\s*=\s*"lenz-db-local"/m);
    expect(updated).toContain('# database_id = ""');
  });

  it('preserves existing valid UUID database_id when no env var is given', () => {
    const initialConfig = `name = "lenz"
[[d1_databases]]
binding = "DB"
database_name = "lenz-db"
database_id = "b592b0fa-d2cf-4b77-94a5-1c7b80e8e452"
`;
    fs.writeFileSync(tempWranglerPath, initialConfig, 'utf-8');

    const result = syncD1Config(tempWranglerPath, '');

    expect(result.success).toBe(true);
    expect(result.updated).toBe(false);
    expect(result.databaseId).toBe('b592b0fa-d2cf-4b77-94a5-1c7b80e8e452');

    const content = fs.readFileSync(tempWranglerPath, 'utf-8');
    expect(content).toContain('database_id = "b592b0fa-d2cf-4b77-94a5-1c7b80e8e452"');
  });

  it('leaves omitted database_id as omitted when no env var is given', () => {
    const initialConfig = `name = "lenz"
[[d1_databases]]
binding = "DB"
database_name = "lenz-db"
`;
    fs.writeFileSync(tempWranglerPath, initialConfig, 'utf-8');

    const result = syncD1Config(tempWranglerPath, '');

    expect(result.success).toBe(true);
    expect(result.updated).toBe(false);
    expect(result.reason).toBe('omitted');

    const content = fs.readFileSync(tempWranglerPath, 'utf-8');
    expect(content).toBe(initialConfig);
  });

  it('safely comments out database_id = "" without leaving stray trailing quotes', () => {
    const initialConfig = `name = "lenz"
[[d1_databases]]
binding = "DB"
database_name = "lenz-db"
database_id = ""
`;
    fs.writeFileSync(tempWranglerPath, initialConfig, 'utf-8');

    const result = syncD1Config(tempWranglerPath, '');

    expect(result.success).toBe(true);
    expect(result.updated).toBe(true);
    expect(result.reason).toBe('placeholder_commented');

    const content = fs.readFileSync(tempWranglerPath, 'utf-8');
    expect(content).toContain('# database_id = ""');
    // Ensure no stray trailing quotes like bindings.""
    expect(content).not.toMatch(/bindings\."/);
  });

  it('safely comments out database_id="" without spaces around equals', () => {
    const initialConfig = `name = "lenz"
[[d1_databases]]
binding = "DB"
database_name = "lenz-db"
database_id=""
`;
    fs.writeFileSync(tempWranglerPath, initialConfig, 'utf-8');

    const result = syncD1Config(tempWranglerPath, '');

    expect(result.success).toBe(true);
    expect(result.updated).toBe(true);
    expect(result.reason).toBe('placeholder_commented');

    const content = fs.readFileSync(tempWranglerPath, 'utf-8');
    expect(content).toContain('# database_id = ""');
    expect(content).not.toMatch(/^database_id\s*=/m);
  });

  it('safely comments out database_id with inline comment without fragment leakage', () => {
    const initialConfig = `name = "lenz"
[[d1_databases]]
binding = "DB"
database_name = "lenz-db"
database_id = "lenz-db-local" # local database
`;
    fs.writeFileSync(tempWranglerPath, initialConfig, 'utf-8');

    const result = syncD1Config(tempWranglerPath, '');

    expect(result.success).toBe(true);
    expect(result.updated).toBe(true);

    const content = fs.readFileSync(tempWranglerPath, 'utf-8');
    expect(content).toContain('# database_id = ""');
    // Ensure entire line was replaced cleanly
    expect(content).not.toContain('# local database');
  });

  it('safely comments out non-UUID dummy values to prevent Cloudflare code 10021 error', () => {
    const initialConfig = `name = "lenz"
[[d1_databases]]
binding = "DB"
database_name = "lenz-db"
database_id = "lenz-db"
`;
    fs.writeFileSync(tempWranglerPath, initialConfig, 'utf-8');

    const result = syncD1Config(tempWranglerPath, '');

    expect(result.success).toBe(true);
    expect(result.updated).toBe(true);
    expect(result.reason).toBe('placeholder_commented');

    const content = fs.readFileSync(tempWranglerPath, 'utf-8');
    expect(content).toContain('# database_id = ""');
    expect(content).not.toMatch(/^database_id\s*=\s*"lenz-db"/m);
  });
});

