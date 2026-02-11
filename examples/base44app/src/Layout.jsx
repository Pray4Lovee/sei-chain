import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { advancedNavigation, bazaarNavigation } from "./navigation";

const navGroups = [
  { title: "Advanced Core", items: advancedNavigation },
  { title: "Bazaar Codex Mesh", items: bazaarNavigation },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex">
        <aside className="w-80 h-screen sticky top-0 overflow-y-auto border-r border-slate-200 bg-white/90 backdrop-blur-xl">
          <div className="px-6 py-5 border-b border-slate-200">
            <h1 className="text-xl font-bold text-slate-900">GenZk-402</h1>
            <p className="text-xs text-slate-500">Bazaar Codex control deck</p>
          </div>
          <nav className="px-4 py-5 space-y-6">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">{group.title}</p>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                          isActive
                            ? "bg-indigo-600 text-white shadow"
                            : "text-slate-600 hover:bg-slate-100"
                        }`
                      }
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur">
            <div>
              <h2 className="text-lg font-semibold">Bazaar Codex Mesh</h2>
              <p className="text-xs text-slate-500">Macro + micro layers fused for sovereign speed.</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">A2A synced</span>
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-indigo-700">Multi-chain ready</span>
            </div>
          </header>
          <main className="min-h-[calc(100vh-72px)] p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
