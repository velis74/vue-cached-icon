<template>
  <div v-if="loadedSvg" :key="loadedSvgKey" class="cached-icon-wrapper" v-html="loadedSvg" />
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, ref, watch } from 'vue';

import { globalCache, IconDefOrPromise, IconGetResponse, ResolvedIconGetResponse } from './cache';
import { resolveProviderUrl } from './providers';
import { augment } from './svg-augment';

const props = defineProps<{ name?: string }>();
const emit = defineEmits<{ (e: 'icon-loaded', name: string): void }>();

const loadedSvg = ref('' as IconDefOrPromise);
const loadedSvgKey = computed(() =>
  (loadedSvg.value as IconGetResponse)?.then ? 'loading' : (loadedSvg.value as string),
);

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
const loadSVG = async () => {
  const name = props.name;

  if (!name) return; // Name is not defined, so don't render anything
  loadedSvg.value = '&hellip;'; // ellipsis while we're loading
  try {
    if (hasCache()) {
      // icon is already in cache
      setLoadedSVG(await getCache());
    } else if (name.toLowerCase().includes('<svg')) {
      // icon is a svg image string literal
      setLoadedSVG(name);
    } else {
      // if icon name contains a '/' character, we assume it's a network resource, otherwise an ion icon
      const url = resolveProviderUrl(name);
      // first we set cache to axios promise
      const res1 = (await setCache(axios.get(url))) as ResolvedIconGetResponse;
      setLoadedSVG(setCache(augment(res1.data)) as string); // then to sanitized svg
    }
  } catch (err: unknown) {
    console.error(`Failed loading CachedIcon. Wrong icon name or URL? (${name})`, err);
  }
};

watch(
  () => props.name,
  () => {
    loadedSvg.value = '';
    loadSVG();
  },
);

loadSVG();
</script>
