export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[30px] font-semibold leading-none tracking-[-0.045em] sm:text-[36px]">{title}</h1>
        {description && <p className="mt-2 text-[15px] text-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Placeholder({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader title={title} />
      <div className="mt-6 rounded-[28px] border border-dashed border-line-2 px-6 py-16 text-center text-sm text-muted">
        {children}
      </div>
    </div>
  );
}
