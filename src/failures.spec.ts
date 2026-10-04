import { flushPromises, mount, VueWrapper } from '@vue/test-utils';
import { vi } from 'vitest'; // the rest are handled by globals: true

import { globalCache } from './cache';
import CachedIcon from './cached-icon.vue';
import { retryFailedIcons } from './failures';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('axios', () => ({ default: { get } }));

const SVG = { data: '<svg id="kladivo"></svg>' };
const httpError = (status: number, headers: Record<string, string> = {}) =>
  Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, headers } });

describe('CachedIcon failed loads', () => {
  const mounted: VueWrapper[] = [];
  const mountIcon = (name: string) => {
    const icon = mount(CachedIcon, { props: { name } });
    mounted.push(icon);
    return icon;
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    get.mockReset();
    globalCache.clear();
  });
  afterEach(() => {
    mounted.splice(0).forEach((icon) => icon.unmount());
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('retries a network error after 2 s with one request shared by all icons of that name', async () => {
    get.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValue(SVG);
    const icon1 = mountIcon('/icon.svg');
    const icon2 = mountIcon('/icon.svg');
    await flushPromises();
    expect(icon1.html()).toContain('…');
    vi.advanceTimersByTime(1999);
    await flushPromises();
    expect(get).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    await flushPromises();
    expect(get).toHaveBeenCalledTimes(2);
    expect(icon1.html()).toContain('kladivo');
    expect(icon2.html()).toContain('kladivo');
  });

  it('doubles the delay after every failed attempt', async () => {
    get.mockRejectedValueOnce(httpError(503)).mockRejectedValueOnce(httpError(503)).mockResolvedValue(SVG);
    const icon = mountIcon('/icon.svg');
    await flushPromises();
    vi.advanceTimersByTime(2000);
    await flushPromises();
    expect(get).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(3999);
    await flushPromises();
    expect(get).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1);
    await flushPromises();
    expect(get).toHaveBeenCalledTimes(3);
    expect(icon.html()).toContain('kladivo');
  });

  it.each([401, 403, 408, 429, 500])('retries HTTP status %i', async (status) => {
    get.mockRejectedValueOnce(httpError(status)).mockResolvedValue(SVG);
    const icon = mountIcon('/icon.svg');
    await flushPromises();
    vi.advanceTimersByTime(2000);
    await flushPromises();
    expect(icon.html()).toContain('kladivo');
  });

  it('waits as long as Retry-After asks', async () => {
    get.mockRejectedValueOnce(httpError(429, { 'retry-after': '10' })).mockResolvedValue(SVG);
    mountIcon('/icon.svg');
    await flushPromises();
    vi.advanceTimersByTime(9999);
    await flushPromises();
    expect(get).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    await flushPromises();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('waits until the date Retry-After names', async () => {
    const retryAt = new Date(Math.ceil(Date.now() / 1000) * 1000 + 30000); // HTTP dates have a resolution of 1 s
    get.mockRejectedValueOnce(httpError(503, { 'retry-after': retryAt.toUTCString() })).mockResolvedValue(SVG);
    const delay = retryAt.getTime() - Date.now();
    mountIcon('/icon.svg');
    await flushPromises();
    vi.advanceTimersByTime(delay - 1);
    await flushPromises();
    expect(get).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    await flushPromises();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['HTTP status 404', () => get.mockRejectedValueOnce(httpError(404))],
    ['a response that is not an SVG', () => get.mockResolvedValueOnce({ data: 'not an icon' })],
  ])('does not retry %s on its own, but does on retryFailedIcons', async (_, fail) => {
    fail();
    get.mockResolvedValue(SVG);
    const icon = mountIcon('/icon.svg');
    await flushPromises();
    vi.advanceTimersByTime(120000);
    await flushPromises();
    expect(get).toHaveBeenCalledTimes(1);
    expect(icon.html()).toContain('…');
    retryFailedIcons();
    await flushPromises();
    expect(get).toHaveBeenCalledTimes(2);
    expect(icon.html()).toContain('kladivo');
  });

  it('retries right away when the browser comes back online', async () => {
    get.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValue(SVG);
    const icon = mountIcon('/icon.svg');
    await flushPromises();
    window.dispatchEvent(new Event('online'));
    await flushPromises();
    expect(get).toHaveBeenCalledTimes(2);
    expect(icon.html()).toContain('kladivo');
  });

  it('does not retry for an icon that is no longer displayed', async () => {
    get.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValue(SVG);
    const icon = mountIcon('/icon.svg');
    await flushPromises();
    icon.unmount();
    vi.advanceTimersByTime(120000);
    retryFailedIcons();
    await flushPromises();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('shares a failure with icons mounted before the retry is due, and retries for icons mounted after', async () => {
    get.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValue(SVG);
    mountIcon('/icon.svg').unmount();
    await flushPromises();
    const early = mountIcon('/icon.svg');
    await flushPromises();
    expect(get).toHaveBeenCalledTimes(1);
    expect(early.html()).toContain('…');
    early.unmount();
    vi.advanceTimersByTime(2000);
    const late = mountIcon('/icon.svg');
    await flushPromises();
    vi.advanceTimersByTime(0);
    await flushPromises();
    expect(get).toHaveBeenCalledTimes(2);
    expect(late.html()).toContain('kladivo');
  });

  it('stops retrying the previous icon when the name changes', async () => {
    get.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValue(SVG);
    const icon = mountIcon('/icon.svg');
    await flushPromises();
    await icon.setProps({ name: '/other.svg' });
    await flushPromises();
    vi.advanceTimersByTime(120000);
    await flushPromises();
    expect(get.mock.calls.map(([url]) => url)).toStrictEqual(['/icon.svg', '/other.svg']);
  });
});
