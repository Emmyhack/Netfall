export function DevSection({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-rule py-12">
      <h2 className="text-3xl text-ink">{title}</h2>
      {note && <p className="mt-3 max-w-content text-lg text-ink-2">{note}</p>}
      <div className="mt-8 space-y-10">{children}</div>
    </section>
  );
}

export function DevCase({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-sm text-ink-3">{label}</p>
      <div className="rounded-card border border-rule bg-surface p-5">{children}</div>
    </div>
  );
}
