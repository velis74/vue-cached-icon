import { shallowMount, flushPromises } from '@vue/test-utils';
import { vi } from 'vitest'; // the rest are handled by globals: true and @types/jest dependency

import { globalCache } from './cache';
import CachedIcon from './cached-icon.vue';

let requestsCount = 0;

vi.mock('axios', () => ({
  default: {
    get: async (url: string) => {
      requestsCount += 1;
      if (url.includes('failure')) throw new Error('bad url');
      if (url.includes('test.svg')) return { data: '<svg id="kladivo"></svg>' };
      return {
        data:
          '<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" ' +
          'viewBox="0 0 512 512"><title>Warning</title><path d="M449.07 399.08L278.64 82.58c-12.08-22.44-44.26-' +
          '22.44-56.35 0L51.87 399.08A32 32 0 0080 446.25h340.89a32 32 0 0028.18-47.17zm-198.6-1.83a20 20 0 1120-20' +
          ' 20 20 0 01-20 20zm21.72-201.15l-5.74 122a16 16 0 01-32 0l-5.74-121.95a21.73 21.73 0 0121.5-22.69h.21' +
          'a21.74 21.74 0 0121.73 22.7z"/></svg>',
      };
    },
  },
}));

describe('CachedIcon', () => {
  it("renders for icon and doesn't render when name is null", async () => {
    globalCache.clear();
    const icon1 = shallowMount(CachedIcon, { propsData: { name: 'accessibility-outline' } });
    await flushPromises();
    expect(icon1.html()).toContain('div');
    await icon1.setProps({ name: undefined });
    expect(icon1.html()).toMatch('');
  });
  it("emits event when rendered and there's a SVG in the DOM", async () => {
    globalCache.clear();
    const icon1 = shallowMount(CachedIcon, { propsData: { name: 'ion-accessibility-outline' } });
    await flushPromises();
    // await icon1.vm.$nextTick();
    expect(icon1.emitted('icon-loaded')).toStrictEqual([['ion-accessibility-outline']]);
    expect(icon1.html()).toContain('svg');
  });
  it('loads the mocked SVG, not the actual requested SVG', async () => {
    globalCache.clear();
    const icon1 = shallowMount(CachedIcon, { propsData: { name: 'accessibility-outline' } });
    await flushPromises();
    expect(icon1.html()).toContain('340.89'); // mocked svg contains this value
  });
  it('fails loading icon and remains in ellipsis state', async () => {
    globalCache.clear();
    const iconFailed1 = shallowMount(CachedIcon, { propsData: { name: 'failure' } });
    const iconFailed2 = shallowMount(CachedIcon, { propsData: { name: 'failure' } });
    await flushPromises();
    expect(iconFailed1.html()).toContain('…'); // svg remains with ellipsis
    expect(iconFailed2.html()).toContain('…'); // svg remains with ellipsis
  });
  it('loads two SVGs, but only makes one request', async () => {
    const rc = requestsCount;
    globalCache.clear();
    const icon1 = shallowMount(CachedIcon, { propsData: { name: 'accessibility-outline' } });
    const icon2 = shallowMount(CachedIcon, { propsData: { name: 'accessibility-outline' } });
    await flushPromises();
    expect(icon1.html()).toContain('340.89'); // mocked svg contains this value
    expect(icon2.html()).toContain('340.89'); // mocked svg contains this value
    expect(requestsCount).toEqual(rc + 1);
  });
  it('loads two SVGs one after the other, loading the other from cache without promises', async () => {
    const rc = requestsCount;
    globalCache.clear();
    const icon1 = shallowMount(CachedIcon, { propsData: { name: 'accessibility-outline' } });
    await flushPromises();
    expect(icon1.html()).toContain('340.89'); // mocked svg contains this value
    const icon2 = shallowMount(CachedIcon, { propsData: { name: 'accessibility-outline' } });
    await flushPromises();
    expect(icon2.html()).toContain('340.89'); // mocked svg contains this value
    expect(requestsCount).toEqual(rc + 1);
  });
  it('loads svg from literal string', async () => {
    globalCache.clear();
    const icon1 = shallowMount(CachedIcon, {
      propsData: {
        name: `
<svg height="537.6" width="298" xmlns="http://www.w3.org/2000/svg" viewBox="0 -15 298 517.6">
  <defs>
    <symbol id="peco">
      <path d="M114.6 354.7c0 4.3-3.5 7.4-7.4 7.4H59c-3.8 0-7.4-3.1-7.4-7.4v-52.5a10 10 0 0 1 10.1-10.1h42.8
               a10 10 0 0 1 10 10.1v52.5z"/>
      <path d="M102.8 360.1H84.4v71c0 12.6 18.4 12.6 18.4 0v-71zM81.6 360.1H63.2v71c0 12.5 18.4 12.5 18.4 0v-71z"/>
      <path d="M83.3 287.8a13.8 13.8 0 1 0 0-27.6 13.8 13.8 0 0 0 0 27.6z"/>
    </symbol>
    <symbol id="d-puscica">
      <path d="M202.9 21.5c-.2-28.5 41-28.8 41.2 0l-.6 86.5L265.7 81C281 64 308 87.5 291.3 106.5l-53.8 64
               c-8.5 8.5-19.5 8.5-28 0L156 106.2c-16.7-19 10.5-42.7 25.6-25.6l22 27.4-.7-86.5z"/>
    </symbol>
    <symbol id="l-puscica">
      <path d="M53.1 155.6c-.2 28.5 41 28.8 41.3 0L93.8 69 116 96.2c15.3 16.8 42.2-6.6 25.6-25.6l-53.8-64
               c-8.5-8.6-19.6-8.5-28 0L6.2 70.8c-16.6 19 10.6 42.6 25.6 25.6l22-27.5-.7 86.6z"/>
    </symbol>
    <clipPath id="l-puscica-dol">
      <rect x="0" y="0" width="298" height="$y1"/>
    </clipPath>
    <clipPath id="d-puscica-gor">
      <rect x="0" y="$0" width="298" height="$y2"/>
    </clipPath>
  </defs>
  <g opacity=".81">
    <path d="M0 448V230a39.2 39.2 0 0 1 39.8-39.8h218.5A39.5 39.5 0 0 1 298 230v218a38.6 38.6 0 0 1-39.5 39.6H39.8
             A39.5 39.5 0 0 1 0 448z"/>
    <path d="M41.2 231.9h215.6v214.4H41.2V231.9z" fill="#fff"/>
    <use href="#l-puscica" y="$y2" clip-path="url(#l-puscica-dol)"/>
    <use href="#l-puscica" y="-$y1"/>
    <use href="#d-puscica" y="$y1" clip-path="url(#d-puscica-gor)"/>
    <use href="#d-puscica" y="-$y2"/>
    <use href="#peco"/>
    <use href="#peco" x="66"/>
    <use href="#peco" x="132"/>
    <use href="//evil" x="132"/>
    <use xlink:href="//evil" x="132"/>
  </g>
  </svg>
      `
          .replace(/\$y1/g, String(0))
          .replace(/\$y2/g, String(187)),
      },
    });
    await flushPromises();
    expect(icon1.html()).toContain('puscica');
  });
  it('loads svg from local server resource', async () => {
    globalCache.clear();
    const icon1 = shallowMount(CachedIcon, { propsData: { name: '/test.svg' } });
    await flushPromises();
    expect(icon1.html()).toContain('kladivo');
  });
});
