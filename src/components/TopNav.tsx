import { Link, NavLink } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";

const links = [
  { label: "Overview", href: "#overview" },
  { label: "Modules", href: "#modules" },
];

export function TopNav() {
  return (
    <header className="top-nav">
      <Link className="brand" to="/">
        <BrandMark />
        <div>
          <strong>Vanta</strong>
          <span>Shield. Settle privately. Share receipts.</span>
        </div>
      </Link>

      <nav className="nav-links" aria-label="Primary">
        {links.map((link) => (
          <a key={link.label} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>

      <div className="nav-actions">
        <NavLink className="button button-ghost" to="/app/shield">
          Shield now — get receipt
        </NavLink>
      </div>
    </header>
  );
}
