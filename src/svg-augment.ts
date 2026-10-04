import DOMPurify from 'isomorphic-dompurify';

let hookRegistered = false;

/**
 * Prepares an SVG string for inline rendering: removes its <title>, paints it in currentColor unless it mentions
 * currentColor already, sizes it to 1em where it declares no width / height, and sanitises it with DOMPurify, which
 * also removes elements referencing anything other than a fragment within the SVG (`href="#id"`).
 * @param svg SVG markup
 * @returns sanitised SVG markup
 */
export function augment(svg: string): string {
  if (!hookRegistered) {
    // registered on first use rather than at import, so that importing this module during server-side rendering
    // does not touch DOMPurify
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

  // the <title> element is part of an element's text in selenium, so it would end up in the text of e.g. a button
  // containing the icon
  let result = svg.replace(/<title>.*<\/title>/i, '');
  if (!result.includes('currentColor')) {
    // a default fill only: colours the svg defines on its own elements, e.g. fill="black", still take precedence
    result = result.replace(/(<svg)(\s)(.*)/i, '$1 fill="currentColor" $3');
  }
  // Icon sets ship a viewBox but no intrinsic size, so an unstyled svg collapses to nothing. These are presentation
  // attributes, so any consumer CSS still wins over them.
  if (!/<svg[^>]*\swidth=/i.test(result)) result = result.replace(/<svg\b/i, '<svg width="1em"');
  if (!/<svg[^>]*\sheight=/i.test(result)) result = result.replace(/<svg\b/i, '<svg height="1em"');
  result = DOMPurify.sanitize(result, { USE_PROFILES: { svg: true }, ADD_TAGS: ['use'] });
  return result;
}
