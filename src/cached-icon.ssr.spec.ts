import { renderToString } from '@vue/server-renderer';
import { vi } from 'vitest'; // the rest are handled by globals: true
import { createSSRApp, h } from 'vue';

import { globalCache } from './cache';
import CachedIcon from './cached-icon.vue';

const { get } = vi.hoisted(() => ({ get: vi.fn(async () => ({ data: '<svg id="kladivo"></svg>' })) }));
vi.mock('axios', () => ({ default: { get } }));

describe('CachedIcon server-side rendering', () => {
  it('neither fetches nor sanitizes an icon', async () => {
    const app = createSSRApp({
      render: () => [h(CachedIcon, { name: 'ion-warning' }), h(CachedIcon, { name: '<svg id="literal"></svg>' })],
    });
    const html = await renderToString(app);
    expect(html).not.toContain('svg');
    expect(html).not.toContain('&hellip;');
    expect(get).not.toHaveBeenCalled();
    expect(globalCache.check('ion-warning')).toBe(false);
  });
});
