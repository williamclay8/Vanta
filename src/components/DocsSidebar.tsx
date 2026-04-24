import { NavLink } from "react-router-dom";
import { docsSidebarGroups } from "@/docs/docsContent";

export function DocsSidebar() {
  return (
    <aside className="docs-sidebar" aria-label="Docs sidebar">
      <p className="eyebrow docs-sidebar__eyebrow">
        Browse docs
      </p>
      {docsSidebarGroups.map((group) => (
        <section key={group.label} className="docs-sidebar__group">
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
