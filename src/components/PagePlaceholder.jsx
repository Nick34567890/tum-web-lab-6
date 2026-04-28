export default function PagePlaceholder({ title, description }) {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted max-w-2xl">{description}</p>
      <div className="mt-6 p-8 rounded-lg border border-dashed border-border bg-surface text-muted text-sm">
        Coming soon — this view will be wired up in upcoming steps.
      </div>
    </div>
  );
}
