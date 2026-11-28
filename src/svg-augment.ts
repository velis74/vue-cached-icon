import DOMPurify from 'isomorphic-dompurify';

let hookRegistered = false;

/**
 * Prepares an SVG string for inline rendering: removes its <title>, paints it in currentColor unless it mentions
 * currentColor already, gives it a viewBox from its width / height where it declares none, sizes it to 1em where it
 * declares no width / height, and sanitises it with DOMPurify, which
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

  // <title> elements are part of an element's text in selenium, so they would end up in the text of e.g. a button
  // containing the icon
  let result = svg.replace(/<title\b[^>]*>[\s\S]*?<\/title\s*>/gi, '');
  const openTag = /<svg\b[^>]*>/i.exec(result)?.[0] ?? '';
  const attribute = (name: string) => {
    const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s/>]+))`, 'i').exec(openTag);
    return match ? (match[1] ?? match[2] ?? match[3]) : undefined;
  };
  const pixels = (value?: string) => /^\s*([\d.]+)(?:px)?\s*$/i.exec(value ?? '')?.[1];
  const width = attribute('width');
  const height = attribute('height');
  const added: Record<string, string> = {};

  // a default fill only: colours the svg defines on its own elements, e.g. fill="black", still take precedence
  if (!result.includes('currentColor')) added.fill = 'currentColor';
  // without a viewBox an svg does not scale: sized by the wrapper, it would show a crop of its drawing
  if (attribute('viewBox') === undefined && pixels(width) && pixels(height)) {
    added.viewBox = `0 0 ${pixels(width)} ${pixels(height)}`;
  }
  // Icon sets ship a viewBox but no intrinsic size, so an unstyled svg collapses to nothing. These are presentation
  // attributes, so any consumer CSS still wins over them.
  if (width === undefined) added.width = '1em';
  if (height === undefined) added.height = '1em';

  const inserted = Object.entries(added)
    .map(([name, value]) => ` ${name}="${value}"`)
    .join('');
  if (inserted) result = result.replace(/<svg\b/i, `<svg${inserted}`);
  result = DOMPurify.sanitize(result, { USE_PROFILES: { svg: true }, ADD_TAGS: ['use'] });
  return result;
}
