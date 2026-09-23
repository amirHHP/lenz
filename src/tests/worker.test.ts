import { describe, it, expect, vi } from 'vitest';
import worker from '../../worker/index.js';

describe('Cloudflare Worker Entrypoint (worker/index.ts)', () => {
  it('returns 503 with diagnostic message when /api is called without DB binding', async () => {
    const request = new Request('http://localhost:8787/api/folders');
    const env = {};
    const ctx = {};

    const response = await worker.fetch(request, env, ctx);
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body.error).toContain('Cloudflare D1 database binding (DB) is not configured');
    expect(body.message).toContain('Please bind a D1 database');
  });

  it('routes /api requests to Hono app and handles schema init with mock DB', async () => {
    const mockFirst = vi.fn().mockResolvedValue({ name: 'folders' });
    const mockAll = vi.fn().mockResolvedValue({
      results: [{ id: 1, name: 'Tech', icon: 'cpu', order_index: 0, created_at: '2026-09-22' }]
    });

    const mockDb = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn().mockReturnThis(),
        first: mockFirst,
        all: mockAll,
        run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
      })),
      batch: vi.fn().mockResolvedValue([])
    };

    const request = new Request('http://localhost:8787/api/folders');
    const env = { DB: mockDb };
    const ctx = {};

    const response = await worker.fetch(request, env, ctx);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.folders).toBeDefined();
    expect(body.folders.length).toBe(1);
    expect(body.folders[0].name).toBe('Tech');
  });

  it('delegates asset requests to env.ASSETS when available', async () => {
    const mockAssetsFetch = vi.fn().mockResolvedValue(new Response('html content', { status: 200 }));
    const request = new Request('http://localhost:8787/');
    const env = {
      ASSETS: {
        fetch: mockAssetsFetch
      }
    };
    const ctx = {};

    const response = await worker.fetch(request, env, ctx);
    expect(response.status).toBe(200);
    expect(mockAssetsFetch).toHaveBeenCalledWith(request);
  });

  it('returns 404 for non-api requests when env.ASSETS is missing', async () => {
    const request = new Request('http://localhost:8787/some-page');
    const env = {};
    const ctx = {};

    const response = await worker.fetch(request, env, ctx);
    expect(response.status).toBe(404);
  });
});
