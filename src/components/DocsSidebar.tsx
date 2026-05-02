import { NavLink, useLocation } from "react-router-dom";
import { docsPages, docsSidebarGroups } from "@/docs/docsContent";

export function DocsSidebar() {
  const location = useLocation();
  const activePage =
    docsPages.find((page) => page.slug === location.pathname) ??
    docsPages.find(
      (page) => page.slug !== "/docs" && location.pathname.startsWith(`${page.slug}/`),
    ) ??
    docsPages[0];

  return (
    <aside className="docs-sidebar" aria-label="Docs sidebar">
      <div className="docs-sidebar__header">
        <p className="eyebrow docs-sidebar__eyebrow">Browse docs</p>
        <span className="docs-sidebar__current">{activePage.title}</span>
      </div>
      {docsSidebarGroups.map((group) => (
        <section
          key={group.label}
          className="docs-sidebar__group"
          data-docs-sidebar-group={group.id}
          data-active={group.pages.some((page) => page.section === activePage.section)}
        >
          <span className="docs-sidebar__label">{group.label}</span>
          <nav className="docs-sidebar__nav" aria-label={group.label}>
            {group.pages.map((page) => (
              <NavLink
                key={page.slug}
                to={page.slug}
                end={page.section === "home"}
                className={({ isActive }) =>
                  isActive
                    ? "docs-sidebar__link docs-sidebar__link--active"
                    : "docs-sidebar__link"
                }
                data-docs-sidebar-link={page.section}
                data-docs-track={page.track}
              >
                {page.title}
              </NavLink>
            ))}
          </nav>
        </section>
      ))}
    </aside>
  );
}
