// Imported for its side effect: running at module scope, the default stylesheet lands in the document exactly once,
// no matter how many icons are mounted.
export const DEFAULT_ICON_CSS =
  '.cached-icon-wrapper{display:inline-flex;align-items:center;justify-content:center;width:1em;height:1em}' +
  // :where() keeps the specificity of .cached-icon-wrapper>svg, so consumer overrides of that selector still win
  '.cached-icon-wrapper:where(:not(.cached-icon-own-size))>svg{width:100%;height:100%}' +
  // opt-in: the svg keeps its width / height attributes and the wrapper takes its size
  '.cached-icon-wrapper.cached-icon-own-size{width:auto;height:auto}' +
  // object-fit is needed here because, unlike an SVG's viewBox, a raster image has no built-in way to keep its
  // aspect ratio when width/height are forced to 100% of the wrapper
  '.cached-icon-wrapper>img{width:100%;height:100%;object-fit:contain}';

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.setAttribute('data-vue-cached-icon', '');
  style.textContent = DEFAULT_ICON_CSS;
  // prepended so that consumer stylesheets, coming later in the cascade, override these defaults without !important
  document.head.prepend(style);
}
