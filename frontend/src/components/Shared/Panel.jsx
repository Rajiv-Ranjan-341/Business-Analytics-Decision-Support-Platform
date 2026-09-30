/**
 * The one surface primitive in the app. A hairline-ruled sheet, square-cornered
 * like a page in a ledger — deliberately not a rounded card with a soft shadow.
 *
 * Panels feed out like paper when they mount, which is the moment a person's
 * numbers arrive. `delay` staggers a column of them so the page reads top to
 * bottom; pass `feed={false}` for anything that is already on screen and would
 * only flicker. The animation is dropped entirely under reduced motion.
 */
export default function Panel({
  title,
  description,
  action,
  children,
  className = '',
  bodyClassName = 'p-5',
  feed = true,
  delay = 0,
}) {
  const titled = title || action;

  return (
    <section
      className={`border border-kraft bg-sheet ${feed ? 'paper-feed' : ''} ${className}`}
      style={delay ? { '--feed-delay': `${delay}ms` } : undefined}
    >
      {titled && (
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-kraft px-5 py-4">
          <div>
            {title && <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 max-w-[70ch] text-sm text-ink/70">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
