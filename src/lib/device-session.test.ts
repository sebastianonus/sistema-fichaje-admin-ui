import { beforeEach, describe, expect, it, vi } from 'vitest';
import { describeCurrentDevice, getWorkerDeviceHeaders, getWorkerDeviceId, logoutWorkerDeviceSession } from '@/lib/device-session';

describe('worker device identity', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',
    });
  });

  it('keeps a stable device id in local storage', () => {
    const first = getWorkerDeviceId();
    expect(first.length).toBeGreaterThanOrEqual(16);
    expect(getWorkerDeviceId()).toBe(first);
  });

  it('describes the browser and sends the same device id in headers', () => {
    expect(describeCurrentDevice()).toEqual({
      browser: 'Google Chrome',
      platform: 'Windows',
      label: 'Google Chrome en Windows',
    });
    expect(getWorkerDeviceHeaders()['x-device-id']).toBe(getWorkerDeviceId());
  });

  it('records an explicit worker logout before closing the auth session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, data: { closed: true } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await logoutWorkerDeviceSession('worker-token');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/worker-session'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
