import DOMPurify from 'isomorphic-dompurify';

let hookRegistered = false;

export function augment(svg: string): string {
  if (!hookRegistered) {
    // We need to register the hook here, otherwise we mess up SSR
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.hasAttribute('xlink:href') && !node.getAttribute('xlink:href')?.match(/^#/)) {
        node.remove();
      }
      if (node.hasAttribute('href') && !node.getAttribute('href')?.match(/^#/)) {
        node.remove();
      }
    });
    hookRegistered = true;
  }

  // remove the title attribute because it's messing with selenium getting element text (title is included)
  // this makes getting button text much harder, especially because this icon is lazy-loading
  let result = svg.replace(/<title>.*<\/title>/i, '');
  if (!result.includes('currentColor')) {
    // The provided icon doesn't specify its colours as currentColor. Let's try to assign them. Of course,
    // this will have zero effect if the svg actually defines its colours otherwise, e.g. by specifying fill="black"
    result = result.replace(/(<svg)(\s)(.*)/i, '$1 fill="currentColor" $3');
  }
  // Icon sets ship a viewBox but no intrinsic size, so an unstyled svg collapses to nothing. These are presentation
  // attributes, so any consumer CSS still wins over them.
  if (!/<svg[^>]*\swidth=/i.test(result)) result = result.replace(/<svg\b/i, '<svg width="1em"');
  if (!/<svg[^>]*\sheight=/i.test(result)) result = result.replace(/<svg\b/i, '<svg height="1em"');
  result = DOMPurify.sanitize(result, { USE_PROFILES: { svg: true }, ADD_TAGS: ['use'] });
  return result;
}
