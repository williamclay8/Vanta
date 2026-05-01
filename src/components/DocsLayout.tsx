import { NavLink, Outlet } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";
import { DocsSidebar } from "@/components/DocsSidebar";
import { docsPrimaryNavPages } from "@/docs/docsContent";

export function DocsLayout() {
  return (
    <div className="docs-shell" data-product-shell="docs">
      <header className="docs-shell__topbar" data-docs-header data-product-topbar>
        <NavLink to="/docs" className="docs-shell__brand" aria-label="Vanta Docs home">
          <BrandMark />
          <div className="docs-shell__brand-copy">
            <strong>Vanta</strong>
            <span>Docs handbook</span>
          </div>
        </NavLink>
        <div className="docs-shell__topbar-actions">
          <nav
            className="docs-shell__nav"
            aria-label="Docs primary navigation"
            data-docs-header-nav
            data-product-nav
          >
            {docsPrimaryNavPages.map((page) => (
              <NavLink
                key={page.slug}
                to={page.slug}
                className={({ isActive }) =>
                  isActive
                    ? "docs-shell__nav-link docs-shell__nav-link--active"
                    : "docs-shell__nav-link"
                }
                data-docs-topnav-link={page.section}
              >
                {page.navigation.topNavLabel}
              </NavLink>
            ))}
          </nav>
          <div className="docs-shell__actions" data-docs-header-cta>
            <NavLink
              to="/app/shield"
              className="docs-shell__app-cta"
              data-docs-open-app-cta
            >
              Open App
            </NavLink>
          </div>
        </div>
      </header>

      <div className="docs-shell__body">
        <DocsSidebar />
        <main className="docs-shell__content" aria-label="Docs content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
