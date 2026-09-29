import { beforeEach, describe, expect, it, vi } from 'vitest';
import { describeCurrentDevice, getWorkerDeviceHeaders, getWorkerDeviceId } from '@/lib/device-session';

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
});
