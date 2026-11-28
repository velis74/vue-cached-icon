# Changelog

## 3.2.3 (2026-11-28)

- The wrapper element stays the same while the icon loads and when `name` changes; only its content is replaced. A
  focused icon (e.g. with `tabindex`) keeps the focus when its SVG arrives.
- An SVG with a `width` and `height` in pixels but no `viewBox` gets a `viewBox` of that size, so it scales to the
  wrapper instead of being cropped.

## 3.2.2 (2026-11-17)

- An icon whose `name` changes while the previous icon is still loading no longer shows the previous icon when that
  load finishes; a name changed away and back loads, emits `icon-loaded` and retries once.
- An icon unmounted while its load fails is not registered for retries, so `retryFailedIcons()` and the `online`
  event do not request it again.
- Every `<title>` of an SVG is removed, also one with attributes or spanning lines; the elements between two titles
  are kept.
- During server-side rendering and before mount the component renders an empty `<span class="cached-icon-wrapper">`
  with its accessibility and passed-through attributes; with an empty `name` it renders nothing.
- The UMD build exposes the global `VueCachedIcon` and expects the globals `Vue`, `axios` and `DOMPurify`.
- The class `cached-icon-own-size` lets an SVG keep its own `width` / `height`; the wrapper takes the size of the SVG,
  and a raster image renders at its natural size.

## 3.2.1 (2026-11-14)

- An icon is hidden from assistive technology (`aria-hidden="true"` on the wrapper) unless it has an `aria-label` or
  `aria-labelledby`; then the wrapper is `role="img"`. A raster image has an empty `alt`, so its URL is not read
  out.

## 3.2.0 (2026-10-04)

- A response that is not valid SVG is rejected also for icons that load the same name concurrently or later from the
  cache, instead of being sanitised and rendered.
- Icons that fail with a network error, HTTP 5xx, 401, 403, 408 or 429 are retried while displayed, with a delay
  doubling from 2 s to 60 s or as `Retry-After` asks, and right away when the browser comes back online. Other
  failures are not retried.
- `retryFailedIcons()` loads every failed icon again, e.g. after the user logs in.
- A failed load is logged once per request instead of once per icon.
- Icons load on mount: during server-side rendering the component neither fetches nor sanitises. Fixes
  `addHook is not a function` in SSR environments that define a stub `window`, and hydration mismatches.

## 3.1.1 (2026-08-29)

- Raster image URLs render as `<img>`.
- Responses that are not valid SVG are rejected.

## 3.1.0 (2026-08-10)

- Default styling: icons sized to `1em`.
- Fixed TypeScript definitions import.

## 3.0.5 (2026-04-06), 3.0.4 (2026-04-06)

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
