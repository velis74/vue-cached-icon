import { renderToString } from '@vue/server-renderer';
import { vi } from 'vitest'; // the rest are handled by globals: true
import { createSSRApp, h } from 'vue';

import CachedIcon from './cached-icon.vue';

const { get } = vi.hoisted(() => ({ get: vi.fn(async () => ({ data: '<svg id="kladivo"></svg>' })) }));
vi.mock('axios', () => ({ default: { get } }));

const render = (props: Record<string, unknown>) => renderToString(createSSRApp({ render: () => h(CachedIcon, props) }));

describe('CachedIcon server-side rendering', () => {
  beforeEach(() => get.mockClear());

  it.each([
    ['a provider icon', 'ion-warning'],
    ['a URL', '/icons/warning.svg'],
    ['an SVG literal', '<svg id="literal"></svg>'],
    ['a raster image', '/images/photo.png'],
  ])('renders an empty decorative wrapper for %s and neither fetches nor sanitises it', async (_, name) => {
    const span = new DOMParser().parseFromString(await render({ name }), 'text/html').body.firstElementChild!;
    expect(span.tagName).toBe('SPAN');
    expect(span.getAttributeNames().sort()).toEqual(['aria-hidden', 'class']);
    expect(span.className).toBe('cached-icon-wrapper');
    expect(span.getAttribute('aria-hidden')).toBe('true');
    expect(span.childNodes.length).toBe(0);
    expect(get).not.toHaveBeenCalled();
  });

  it.each([
    ['aria-label', 'Warning'],
    ['aria-labelledby', 'caption'],
  ])('renders an empty image wrapper named by %s', async (attr, value) => {
    const html = await render({ name: 'ion-warning', [attr]: value });
    const span = new DOMParser().parseFromString(html, 'text/html').body.firstElementChild!;
    expect(span.outerHTML).toBe(html);
    expect(span.tagName).toBe('SPAN');
    expect(span.className).toBe('cached-icon-wrapper');
    expect(span.getAttribute('role')).toBe('img');
    expect(span.getAttribute(attr)).toBe(value);
    expect(span.hasAttribute('aria-hidden')).toBe(false);
    expect(span.childNodes).toHaveLength(0);
    expect(get).not.toHaveBeenCalled();
  });

  it('passes fallthrough attributes to the empty wrapper', async () => {
    const html = await render({ name: 'ion-warning', class: 'toolbar-icon', id: 'warn', 'data-test': 'icon' });
    const span = new DOMParser().parseFromString(html, 'text/html').body.firstElementChild!;
    expect(span.outerHTML).toBe(html);
    expect(span.tagName).toBe('SPAN');
    expect([...span.classList].sort()).toStrictEqual(['cached-icon-wrapper', 'toolbar-icon']);
    expect(span.getAttribute('aria-hidden')).toBe('true');
    expect(span.getAttribute('id')).toBe('warn');
    expect(span.getAttribute('data-test')).toBe('icon');
    expect(span.childNodes).toHaveLength(0);
    expect(get).not.toHaveBeenCalled();
  });

  it('hydrates the server markup without a mismatch', async () => {
    const props = { name: 'ion-warning', 'aria-label': 'Warning', class: 'toolbar-icon' };
    const container = document.createElement('div');
    container.innerHTML = await render(props);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const app = createSSRApp({ render: () => h(CachedIcon, props) });
      app.mount(container);
      expect([...warn.mock.calls, ...error.mock.calls].flat().join('\n')).not.toMatch(/hydration/i);
      app.unmount();
    } finally {
      warn.mockRestore();
      error.mockRestore();
    }
  });

  it.each([
    ['an empty name', ''],
    ['no name', undefined],
  ])('renders only a comment node for %s', async (_, name) => {
    expect(await render({ name })).toMatch(/^<!--[^>]*-->$/);
    expect(get).not.toHaveBeenCalled();
  });
});
