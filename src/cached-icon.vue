<template>
  <span v-if="imgSrc" v-bind="a11y" class="cached-icon-wrapper"><img :src="imgSrc" alt="" /></span>
  <span v-else-if="loadedSvg" v-bind="a11y" :key="loadedSvg" class="cached-icon-wrapper" v-html="loadedSvg" />
  <span v-else-if="name" v-bind="a11y" class="cached-icon-wrapper" />
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, onBeforeUnmount, onMounted, ref, useAttrs, watch } from 'vue';

import './inject-styles'; // installs the default icon styling, once per module
import { globalCache, IconDefOrPromise, ResolvedIconGetResponse } from './cache';
import { IconLoadError, registerFailedIcon, toIconLoadError } from './failures';
import { resolveProviderUrl } from './providers';
import { augment } from './svg-augment';

// Raster images are handed to the browser as-is: it decodes and caches them natively, and there is nothing in a
// pixel buffer for DOMPurify to sanitise, so the SVG fetch-and-sanitise path is skipped entirely for these.
const RASTER_EXTENSION_RE = /\.(png|jpe?g|gif|webp|bmp|ico|avif)(?:[?#].*)?$/i;

const props = defineProps<{ name?: string }>();
const emit = defineEmits<{ (e: 'icon-loaded', name: string): void }>();

const attrs = useAttrs();
// an icon named by aria-label / aria-labelledby is an image; any other icon is decorative and hidden
const a11y = computed(() =>
  attrs['aria-label'] || attrs['aria-labelledby'] ? { role: 'img' } : { 'aria-hidden': true },
);

// while both are empty, a named icon renders an empty wrapper: on the server and in the first client render
const loadedSvg = ref('');
const imgSrc = ref('');

const setCache = (name: string, value: IconDefOrPromise) => {
  globalCache.set(name, value);
  return value;
};
/** @param svg augmented markup */
const setLoadedSVG = (name: string, svg: string) => {
  loadedSvg.value = svg;
  emit('icon-loaded', name);
};
const setLoadedImg = (name: string, url: string) => {
  imgSrc.value = url;
  emit('icon-loaded', name);
};
// Validation and augmentation are part of the cached promise: a response that is not an SVG rejects for every icon
// awaiting it, and a valid one resolves to augmented markup for all of them. A failure replaces the promise in the
// cache and is logged once, by the icon that made the request.
const fetchSVG = async (name: string, url: string, attempt: number): Promise<ResolvedIconGetResponse> => {
  let svg: string;
  try {
    const { data } = await axios.get(url);
    if (typeof data !== 'string' || !/<svg[\s>]/i.test(data)) {
      throw new IconLoadError(`Response from "${url}" is not a valid SVG`, attempt);
    }
    svg = data;
  } catch (err: unknown) {
    const failure = toIconLoadError(err, url, attempt);
    globalCache.set(name, failure);
    console.error(`Failed loading CachedIcon. Wrong icon name or URL? (${name})`, failure);
    throw failure;
  }
  return { data: augment(svg) };
};

let unmounted = false;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let unregisterFailedIcon: (() => void) | undefined;
const cancelRetry = () => {
  clearTimeout(retryTimer);
  retryTimer = undefined;
  unregisterFailedIcon?.();
  unregisterFailedIcon = undefined;
};
const scheduleRetry = (name: string, failure: IconLoadError) => {
  const { retryAt } = failure;
  const retry = (fresh: boolean) => {
    cancelRetry();
    globalCache.deleteIf(name, failure); // the first icon to retry starts the request, the others share it
    loadSVG(fresh ? 1 : failure.attempt + 1);
  };
  unregisterFailedIcon = registerFailedIcon({ transient: retryAt !== undefined, retry });
  if (retryAt !== undefined) retryTimer = setTimeout(() => retry(false), Math.max(0, retryAt - Date.now()));
};

/**
 * @param attempt number of this attempt, should it request the icon
 */
const loadSVG = async (attempt = 1) => {
  const name = props.name;

  cancelRetry();
  if (!name) return; // Name is not defined, so don't render anything
  imgSrc.value = '';
  loadedSvg.value = '&hellip;'; // ellipsis while we're loading
  try {
    if (globalCache.check(name)) {
      // icon is already in cache, as augmented markup or a promise of it
      const svg = await globalCache.get(name);
      if (name !== props.name) return; // the icon shows another name by now
      setLoadedSVG(name, svg as string);
    } else if (name.toLowerCase().includes('<svg')) {
      // icon is a svg image string literal
      setLoadedSVG(name, augment(name));
    } else {
      // a registered provider prefix (ion-, mdi-, fa-, ...) resolves to its URL, any other name is used as a URL
      const url = resolveProviderUrl(name);
      if (RASTER_EXTENSION_RE.test(url)) {
        setLoadedImg(name, url);
      } else {
        // first we set cache to the fetch promise, so that concurrent loads of this icon share its outcome
        const { data } = (await setCache(name, fetchSVG(name, url, attempt))) as ResolvedIconGetResponse;
        setCache(name, data); // then to its augmented markup, also when the icon shows another name by now
        if (name !== props.name) return;
        setLoadedSVG(name, data);
      }
    }
  } catch (err: unknown) {
    if (!(err instanceof IconLoadError)) {
      console.error(`Failed loading CachedIcon. Wrong icon name or URL? (${name})`, err);
    } else if (!unmounted && name === props.name) {
      scheduleRetry(name, err); // the icon still shows this name and keeps showing the ellipsis until a retry succeeds
    }
  }
};

watch(
  () => props.name,
  () => {
    loadedSvg.value = '';
    imgSrc.value = '';
    loadSVG();
  },
);
onBeforeUnmount(() => {
  unmounted = true;
  cancelRetry();
});

// loading starts on mount, which does not run during server-side rendering
onMounted(() => loadSVG());
</script>
