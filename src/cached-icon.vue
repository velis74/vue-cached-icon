<template>
  <span v-if="imgSrc" class="cached-icon-wrapper"><img :src="imgSrc" /></span>
  <span v-else-if="loadedSvg" :key="loadedSvg" class="cached-icon-wrapper" v-html="loadedSvg" />
</template>

<script setup lang="ts">
import axios from 'axios';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

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

const loadedSvg = ref('');
const imgSrc = ref('');

const hasCache = () => globalCache.check(props.name as string);
const getCache = async () => globalCache.get(props.name as string);
const setCache = (value: IconDefOrPromise) => {
  globalCache.set(props.name as string, value);
  return value;
};
const setLoadedSVG = (svg: string) => {
  loadedSvg.value = augment(svg);
  emit('icon-loaded', props.name as string);
};
const setLoadedImg = (url: string) => {
  imgSrc.value = url;
  emit('icon-loaded', props.name as string);
};
// Validation is part of the cached promise: a response that is not an SVG rejects for every icon awaiting it, so none
// of them sanitises and renders it. A failure replaces the promise in the cache and is logged once, by the icon that
// made the request.
const fetchSVG = async (name: string, url: string, attempt: number): Promise<ResolvedIconGetResponse> => {
  try {
    const { data } = await axios.get(url);
    if (typeof data !== 'string' || !/<svg[\s>]/i.test(data)) {
      throw new IconLoadError(`Response from "${url}" is not a valid SVG`, attempt);
    }
    return { data };
  } catch (err: unknown) {
    const failure = toIconLoadError(err, url, attempt);
    globalCache.set(name, failure);
    console.error(`Failed loading CachedIcon. Wrong icon name or URL? (${name})`, failure);
    throw failure;
  }
};

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
    if (hasCache()) {
      // icon is already in cache
      setLoadedSVG(await getCache());
    } else if (name.toLowerCase().includes('<svg')) {
      // icon is a svg image string literal
      setLoadedSVG(name);
    } else {
      // a registered provider prefix (ion-, mdi-, fa-, ...) resolves to its URL, any other name is used as a URL
      const url = resolveProviderUrl(name);
      if (RASTER_EXTENSION_RE.test(url)) {
        setLoadedImg(url);
      } else {
        // first we set cache to the validating fetch promise, so that concurrent loads of this icon share its outcome
        const res1 = (await setCache(fetchSVG(name, url, attempt))) as ResolvedIconGetResponse;
        setLoadedSVG(setCache(augment(res1.data)) as string); // then to sanitized svg
      }
    }
  } catch (err: unknown) {
    if (!(err instanceof IconLoadError)) {
      console.error(`Failed loading CachedIcon. Wrong icon name or URL? (${name})`, err);
    } else if (name === props.name) {
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
onBeforeUnmount(cancelRetry);

// Loading starts on mount, which never happens during server-side rendering: the server renders an empty icon, the
// browser loads it. A server's DOM shim has no DOMPurify support, so sanitising there would fail.
onMounted(() => loadSVG());
</script>
