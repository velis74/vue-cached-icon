import { iconProviders, registerIconProvider, resolveProviderUrl } from './providers';

describe('resolveProviderUrl', () => {
  it('builds CDN URLs for the built-in providers', () => {
    expect(resolveProviderUrl('ion-warning')).toBe('https://cdn.jsdelivr.net/npm/ionicons@latest/dist/svg/warning.svg');
    expect(resolveProviderUrl('mdi-home')).toBe('https://cdn.jsdelivr.net/npm/@mdi/svg@latest/svg/home.svg');
    expect(resolveProviderUrl('fa-user')).toBe(
      'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@latest/svgs/solid/user.svg',
    );
  });
  it('passes only the first dash to the provider as separator', () => {
    expect(resolveProviderUrl('ion-arrow-back-outline')).toBe(
      'https://cdn.jsdelivr.net/npm/ionicons@latest/dist/svg/arrow-back-outline.svg',
    );
  });
  it('returns the name unchanged when it has no prefix or an unknown one', () => {
    expect(resolveProviderUrl('/icons/home.svg')).toBe('/icons/home.svg');
    expect(resolveProviderUrl('unknown-home')).toBe('unknown-home');
  });
  it('uses a registered provider, also one that replaces a built-in', () => {
    const builtInIon = iconProviders.ion;
    try {
      registerIconProvider('local', (name) => `/static/${name}.svg`);
      registerIconProvider('ion', (name) => `/ion/${name}.svg`);
      expect(resolveProviderUrl('local-home')).toBe('/static/home.svg');
      expect(resolveProviderUrl('ion-home')).toBe('/ion/home.svg');
    } finally {
      delete iconProviders.local;
      iconProviders.ion = builtInIon;
    }
  });
});
