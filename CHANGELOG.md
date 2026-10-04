# Changelog

## 3.2.0

- A response that is not valid SVG is rejected also for icons that load the same name concurrently or later from the
  cache, instead of being sanitised and rendered.

## 3.1.2

- Icons load on mount: during server-side rendering the component renders an empty wrapper and neither fetches nor
  sanitises. Fixes `addHook is not a function` in SSR environments that define a stub `window`, and hydration
  mismatches.

## 3.1.1

- Raster image URLs render as `<img>`.
- Responses that are not valid SVG are rejected.

## 3.1.0

- Default styling: icons sized to `1em`.
- Fixed TypeScript definitions import.

## 3.0.5, 3.0.4

- Error resilience, tests, package description.

## 3.0.0 – 3.0.3

- Renamed from `vue-ionicon`. Providers `ion-`, `mdi-`, `fa-` and `registerIconProvider`.
- Composition API. SSR and deployment fixes.

## 2.1.1

- Build fix.

## 2.0.0 – 2.1.0

- Vue 3, TypeScript, Vite.

## 1.1.1, 1.1.0

- `<use>` tags with `#` links.

## 1.0.0

- Initial release.
