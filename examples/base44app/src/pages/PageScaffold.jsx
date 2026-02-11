import React from "react";

export default function PageScaffold({ title, subtitle, layers }) {
  return (
    <section className="space-y-6">
      <header className="rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-indigo-100">{subtitle}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {layers.map((layer) => (
          <article key={layer.name} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-600">{layer.name}</h2>
            <p className="mt-2 text-sm text-slate-600">{layer.description}</p>
            <ul className="mt-3 space-y-1 text-xs text-slate-500 list-disc list-inside">
              {layer.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
