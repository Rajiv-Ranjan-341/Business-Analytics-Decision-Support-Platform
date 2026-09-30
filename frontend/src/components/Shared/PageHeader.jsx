export default function PageHeader({ title, description, action }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-kraft pb-5">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1.5 max-w-[72ch] text-ink/70">{description}</p>}
      </div>
      {action}
    </div>
  );
}
