export type IconProvidersRegistry = Record<string, (name: string) => string>;

/** Registered providers by prefix: ion (Ionicons), mdi (Material Design Icons), fa (Font Awesome, solid) */
export const iconProviders: IconProvidersRegistry = {
  ion: (name: string) => `https://cdn.jsdelivr.net/npm/ionicons@latest/dist/svg/${name}.svg`,
  mdi: (name: string) => `https://cdn.jsdelivr.net/npm/@mdi/svg@latest/svg/${name}.svg`,
  fa: (name: string) => `https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@latest/svgs/solid/${name}.svg`,
};

/**
 * Registers a provider for icon names of the form `<prefix>-<icon name>`, replacing any provider with the same prefix
 * @param prefix name prefix, without the dash
 * @param urlBuilder returns the URL of an SVG or raster image for the icon name following the prefix
 */
export function registerIconProvider(prefix: string, urlBuilder: (name: string) => string) {
  iconProviders[prefix] = urlBuilder;
}

/**
 * Returns URL for the prefixed icon name
 * @param name name of icon with provider prefix. if no provider is registered for the prefix (or there is no prefix)
 * it will return the name itself as we assume it's url to the icon
 */
export function resolveProviderUrl(name: string): string {
  const dashIndex = name.indexOf('-');
  if (dashIndex === -1) return name;
  const prefix = name.substring(0, dashIndex);
  const res = iconProviders[prefix];
  if (res == null) return name;
  const iconName = name.substring(dashIndex + 1);
  return res(iconName);
}
