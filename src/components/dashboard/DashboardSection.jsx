export default function DashboardSection({ title, children, t }) {
  return (
    <section className="mt-12">
      {title && (
        <h2 className={`mb-6 px-2 text-sm font-bold tracking-widest uppercase ${t.textPrimary}`}>
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
