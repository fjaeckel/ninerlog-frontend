import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

export interface ReportSection {
  id: string;
  label: string;
}

/**
 * Sticky jump-nav for the Reports page. Scroll-spy uses IntersectionObserver
 * against a band just under the sticky header.
 */
export function SectionNav({ sections }: { sections: ReportSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? '');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const targets = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // Bottom-heavy margin.
      { rootMargin: '-96px 0px -65% 0px', threshold: 0 }
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  // Keep the active tab in view on narrow screens; sets the strip's own
  // scrollLeft directly.
  useEffect(() => {
    const strip = listRef.current;
    const el = strip?.querySelector<HTMLElement>(`[data-section="${active}"]`);
    if (!strip || !el) return;
    const left = el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [active]);

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top, behavior: 'smooth' });
    setActive(id);
  };

  return (
    <div className="sticky top-[var(--header-height)] z-20 -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
      <div className="surface-glass border-b sm:border sm:rounded-lg sm:shadow-sm">
        <div ref={listRef} className="flex gap-1 overflow-x-auto scrollbar-none p-1" role="tablist">
          {sections.map((s) => (
            <button
              key={s.id}
              data-section={s.id}
              role="tab"
              aria-selected={active === s.id}
              onClick={() => jump(s.id)}
              className={cn(
                'segment rounded-md whitespace-nowrap tap-none',
                active !== s.id && 'bg-transparent dark:bg-transparent'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Section wrapper: gives the nav a scroll target and a consistent heading. */
export function ReportSectionBlock({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 mb-10">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
        {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
      </div>
      {children}
    </section>
  );
}
