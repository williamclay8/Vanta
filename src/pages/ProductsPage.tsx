import { useEffect } from "react";
import type { ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";
import {
  getVantaProductSurface,
  vantaProductSuite,
} from "@/products/vantaProductSuite";

function ProductSiteNav() {
  return (
    <nav className="products-site-nav" aria-label="Vanta product navigation">
      <Link className="products-site-nav__brand" to="/">
        <BrandMark />
        <span>VANTA</span>
      </Link>
      <div className="products-site-nav__links">
        <Link to="/products">Products</Link>
        <Link to="/app/pay">Pay</Link>
        <Link to="/docs/trust">Trust</Link>
        <Link to="/app/proof">Proof</Link>
        <Link className="products-site-nav__cta" to="/app">
          Open app
        </Link>
      </div>
    </nav>
  );
}

function ProductsBodyClass({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.body.classList.add("landing-body", "products-body");

    return () => {
      document.body.classList.remove("landing-body", "products-body");
    };
  }, []);

  return <>{children}</>;
}

function ProductFlowVisual() {
  return (
    <div className="products-flow-visual" aria-label="Vanta product flow">
      <div className="products-flow-visual__header">
        <span>Receipt growth loop</span>
        <strong>Private action to counterparty trust</strong>
      </div>
      <div className="products-flow-visual__rail" aria-hidden="true">
        <span data-product-flow-node="private-action">Private action</span>
        <span data-product-flow-node="proof-packet">Trust packet</span>
        <span data-product-flow-node="review">Review</span>
        <span data-product-flow-node="next-use">Next use</span>
      </div>
      <p>
        Each product surface is useful only when it gives a counterparty a precise
        receipt, proof packet, status surface, or verification command.
      </p>
    </div>
  );
}

export function ProductsPage() {
  return (
    <ProductsBodyClass>
      <main className="products-site">
        <div className="landing-minimal__grid" aria-hidden="true" />
        <div className="landing-minimal__glow landing-minimal__glow--left" aria-hidden="true" />
        <div className="landing-minimal__glow landing-minimal__glow--right" aria-hidden="true" />
        <ProductSiteNav />

        <section className="products-hero">
          <div className="products-hero__copy">
            <span className="products-kicker">Vanta products · beta truth</span>
            <h1>Five product surfaces for counterparty-useful privacy.</h1>
            <p>
              Vanta is making room for the products now: Compliance Gateway,
              Private Perps Engine, Shielded RWA Tokenization, Privacy SDK &
              Primitives Marketplace, and Private Velocity Intelligence.
            </p>
            <div className="products-hero__actions">
              <Link className="landing-btn landing-btn--primary" to="/products/compliance-gateway">
                Start with Compliance Gateway
              </Link>
              <Link className="landing-btn landing-btn--ghost" to="/app/pay">
                Open Pay surface
              </Link>
            </div>
          </div>
          <ProductFlowVisual />
        </section>

        <section className="products-suite" aria-label="Vanta product surfaces">
          <div className="products-section-header">
            <span>Product suite</span>
            <h2>Named surfaces, not hidden checks.</h2>
          </div>
          <div className="products-suite__grid">
            {vantaProductSuite.map((surface, index) => (
              <Link
                className="products-card"
                data-vanta-product-card={surface.slug}
                key={surface.slug}
                to={surface.route}
              >
                <span className="products-card__number">{String(index + 1).padStart(2, "0")}</span>
                <span className="products-card__eyebrow">{surface.eyebrow}</span>
                <strong>{surface.name}</strong>
                <p>{surface.summary}</p>
                <small>{surface.publicPacket}</small>
              </Link>
            ))}
          </div>
        </section>

        <section className="products-truth" aria-label="Product truth boundary">
          <div>
            <span>Current truth</span>
            <strong>These pages are product surfaces and verification maps.</strong>
          </div>
          <p>
            They do not lift production privacy, anonymity, regulator approval,
            audited-proof, mainnet settlement readiness, custody, SBF, verifier,
            or real-funds readiness claims.
          </p>
          <Link to="/docs/security">Read security limits</Link>
        </section>
      </main>
    </ProductsBodyClass>
  );
}

export function ProductDetailPage() {
  const { productSlug } = useParams();
  const surface = getVantaProductSurface(productSlug);

  if (!surface) {
    return <Navigate to="/products" replace />;
  }

  return (
    <ProductsBodyClass>
      <main className="products-site products-site--detail">
        <div className="landing-minimal__grid" aria-hidden="true" />
        <div className="landing-minimal__glow landing-minimal__glow--left" aria-hidden="true" />
        <div className="landing-minimal__glow landing-minimal__glow--right" aria-hidden="true" />
        <ProductSiteNav />

        <section className="product-detail">
          <Link className="product-detail__back" to="/products">
            Products
          </Link>
          <div className="product-detail__hero">
            <div>
              <span className="products-kicker">{surface.eyebrow}</span>
              <h1>{surface.name}</h1>
              <p>{surface.summary}</p>
            </div>
            <aside className="product-detail__status" aria-label={`${surface.name} status`}>
              <span>Status</span>
              <strong>{surface.status}</strong>
              <small>{surface.verificationCommand}</small>
            </aside>
          </div>

          <div className="product-detail__grid">
            <section className="product-detail__panel">
              <span>Counterparty</span>
              <p>{surface.counterparty}</p>
            </section>
            <section className="product-detail__panel">
              <span>Trust packet</span>
              <p>{surface.publicPacket}</p>
            </section>
            <section className="product-detail__panel product-detail__panel--wide">
              <span>Capability shape</span>
              <ul>
                {surface.capabilities.map((capability) => (
                  <li key={capability}>{capability}</li>
                ))}
              </ul>
            </section>
            <section className="product-detail__panel">
              <span>Proof lane</span>
              <p>{surface.proofLane}</p>
            </section>
            <section className="product-detail__panel">
              <span>Blocked claims</span>
              <ul>
                {surface.blockedClaims.map((claim) => (
                  <li key={claim}>{claim}</li>
                ))}
              </ul>
            </section>
          </div>

          <div className="product-detail__actions">
            <Link className="landing-btn landing-btn--primary" to={surface.appRoute}>
              Open related Vanta surface
            </Link>
            <Link className="landing-btn landing-btn--ghost" to="/app/proof">
              Review proof details
            </Link>
          </div>
        </section>
      </main>
    </ProductsBodyClass>
  );
}
