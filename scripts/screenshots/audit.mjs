/**
 * Layout audit — the checks a screenshot makes you notice, done by measurement.
 *
 * Run over the same targets as the capture, at the same viewports:
 *
 *   npm run shots -- --audit             desktop
 *   npm run shots -- --audit --mobile    390×844
 *
 * It reports four things per screen:
 *
 *   H-SCROLL       the page scrolls sideways — always a bug
 *   small targets  interactive elements under the minimum for the input
 *                  device — 44×44 for a finger, 24×24 (WCAG 2.2 AA) for a
 *                  pointer, because the 44px figure is a touch figure
 *   tiny text      text below 11px, which stops being legible on a phone
 *   width          how much of the available column a page actually uses;
 *                  a list page leaving room on a desktop is wasting it
 *
 * Findings are reported, not enforced — some are deliberate (the sr-only skip
 * link measures 1×1 until focused). Read them, then decide.
 */

/**
 * Runs inside the page. Returns plain data, so it must not close over anything
 * — `min` is passed in because the threshold differs by input device.
 */
export function collectReport(min) {
  const out = { overflowX: 0, smallTargets: [], tinyText: [], widthUsed: 0 };
  const doc = document.documentElement;
  out.overflowX = doc.scrollWidth - doc.clientWidth;

  const label = (el) => {
    const text = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    return `${el.tagName.toLowerCase()}${text ? `("${text}")` : ''}`;
  };

  const interactive = 'button, a[href], input, select, textarea, [role="button"], [role="tab"]';
  for (const el of document.querySelectorAll(interactive)) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    // A visually-hidden skip link is 1×1 until it takes focus, at which point
    // it is full size — not a real miss.
    if (el.className && String(el.className).includes('sr-only')) continue;
    const display = getComputedStyle(el).display;
    const inlineText = el.tagName === 'A' && display.startsWith('inline');
    // An inline link is as wide as its text; only its height is a design choice.
    if (inlineText ? r.height >= min : r.width >= min && r.height >= min) continue;
    // A checkbox inside its own label is tapped through the label, so the
    // label's box is the target that matters.
    const wrapper = el.closest('label');
    if (wrapper) {
      const w = wrapper.getBoundingClientRect();
      if (w.width >= min && w.height >= min) continue;
    }
    out.smallTargets.push(`${label(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
  }

  for (const el of document.querySelectorAll('body *')) {
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!ownText) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 11) out.tinyText.push(`${label(el)} ${size}px`);
  }

  const main = document.querySelector('#main-content');
  const column = main?.querySelector(':scope > div:last-child');
  if (main && column) {
    const style = getComputedStyle(main);
    const avail = main.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    out.widthUsed = Math.round((column.getBoundingClientRect().width / avail) * 100);
  }
  return out;
}

/** Formats one screen's report for the console. Returns null when clean. */
export const TARGET_MIN = { touch: 44, pointer: 24 };

export function formatReport(name, report, { mobile }) {
  const bits = [];
  if (report.overflowX > 0) bits.push(`H-SCROLL +${report.overflowX}px`);
  if (report.smallTargets.length) bits.push(`${report.smallTargets.length} small targets`);
  if (report.tinyText.length) bits.push(`${report.tinyText.length} tiny text`);
  const width = !mobile && report.widthUsed ? `  [${report.widthUsed}% of column]` : '';

  const lines = [`  ${name.padEnd(20)} ${bits.length ? bits.join(' · ') : 'clean'}${width}`];
  for (const t of [...new Set(report.smallTargets)].slice(0, 5)) lines.push(`      small: ${t}`);
  for (const t of [...new Set(report.tinyText)].slice(0, 3)) lines.push(`      tiny:  ${t}`);
  return { text: lines.join('\n'), clean: bits.length === 0 };
}
