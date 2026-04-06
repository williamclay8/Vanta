import { Link, NavLink } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";

const links = [
  { label: "Thesis", href: "#thesis" },
  { label: "Modules", href: "#modules" },
  { label: "Privacy", href: "#privacy" },
  { label: "Roadmap", href: "#roadmap" },
];

export function TopNav() {
  return (
    <header className="top-nav">
      <Link className="brand" to="/">
        <BrandMark />
        <div>
          <strong>Vanta</strong>
          <span>Shield first. Move privately.</span>
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
        <NavLink className="button button-ghost" to="/app">
          Enter Shield
        </NavLink>
      </div>
    </header>
  );
}
