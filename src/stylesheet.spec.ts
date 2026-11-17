import { flushPromises, mount, VueWrapper } from '@vue/test-utils';
import { vi } from 'vitest'; // the rest are handled by globals: true

vi.mock('axios', () => ({ default: { get: vi.fn() } }));

const OWN_SIZE = 'cached-icon-own-size';
const SQUARE = '<svg viewBox="0 0 10 10"><path d="M0 0h10v10H0z"/></svg>';
const SIZED = '<svg width="32" height="16" viewBox="0 0 32 16"><path d="M0 0h32v16H0z"/></svg>';
const WIDTH_ONLY = '<svg width="32" viewBox="0 0 32 16"><path d="M0 0h32v16H0z"/></svg>';

const normalise = (selector: string) => selector.replace(/\s+/g, '');
const packageSheet = () => document.head.querySelector<HTMLStyleElement>('style[data-vue-cached-icon]')!;
const packageRules = () => [...packageSheet().sheet!.cssRules].filter((rule) => rule instanceof CSSStyleRule);

describe('CachedIcon package stylesheet', () => {
  let CachedIcon: (typeof import('./index'))['CachedIcon'];
  const mounted: VueWrapper[] = [];
  const mountIcon = (name: string, attrs: Record<string, unknown> = {}) => {
    const icon = mount(CachedIcon, { props: { name }, attrs, attachTo: document.body });
    mounted.push(icon);
    return icon;
  };

  beforeAll(async () => {
    const appStyle = document.createElement('style');
    appStyle.id = 'app-style';
    appStyle.textContent = '.app { color: red; }';
    document.head.appendChild(appStyle);
    ({ CachedIcon } = await import('./index'));
    mount(CachedIcon, { props: { name: SQUARE } }).unmount();
  });
  afterEach(() => mounted.splice(0).forEach((icon) => icon.unmount()));

  it('is the first element of head, before the styles already there', () => {
    expect(document.head.firstElementChild).toBe(packageSheet());
    expect(document.head.querySelector('#app-style')).not.toBeNull();
  });

  it('keeps the specificity of ".cached-icon-wrapper>svg" for the default SVG size', () => {
    const selectors = packageRules().map((rule) => normalise(rule.selectorText));
    expect(selectors).toContain(`.cached-icon-wrapper:where(:not(.${OWN_SIZE}))>svg`);
  });

  it(`sizes a wrapper with "${OWN_SIZE}" to its SVG`, () => {
    const wrapperRules = packageRules().filter(
      (rule) => rule.selectorText.includes(OWN_SIZE) && !/svg\s*$/.test(rule.selectorText),
    );
    expect(wrapperRules.some((rule) => rule.style.width === 'auto' && rule.style.height === 'auto')).toBe(true);
  });

  it(`passes the "${OWN_SIZE}" class through to the wrapper`, async () => {
    const icon = mountIcon(SIZED, { class: OWN_SIZE });
    await flushPromises();
    expect(icon.classes()).toEqual(expect.arrayContaining(['cached-icon-wrapper', OWN_SIZE]));
  });

  it('fills the 1em wrapper with every SVG without the class', async () => {
    const icons = [mountIcon(SQUARE), mountIcon(SIZED)];
    await flushPromises();
    for (const icon of icons) {
      const svg = icon.find('svg').element;
      expect(window.getComputedStyle(svg).width).toBe('100%');
      expect(window.getComputedStyle(svg).height).toBe('100%');
    }
  });

  it(`keeps the SVG's own size with "${OWN_SIZE}"`, async () => {
    const icon = mountIcon(SIZED, { class: OWN_SIZE });
    await flushPromises();
    const svg = icon.find('svg').element;
    expect(svg.getAttribute('width')).toBe('32');
    expect(svg.getAttribute('height')).toBe('16');
    expect(window.getComputedStyle(svg).width).not.toBe('100%');
    expect(window.getComputedStyle(svg).height).not.toBe('100%');
  });

  it(`keeps 1em in a dimension the SVG does not declare with "${OWN_SIZE}"`, async () => {
    const icon = mountIcon(WIDTH_ONLY, { class: OWN_SIZE });
    await flushPromises();
    const svg = icon.find('svg').element;
    expect(svg.getAttribute('width')).toBe('32');
    expect(window.getComputedStyle(svg).width).not.toBe('100%');
    expect(window.getComputedStyle(svg).height).not.toBe('100%');
    expect(svg.getAttribute('height')).toBe('1em');
  });
});
