type MobileWalletOpenLink = {
  id: "phantom" | "solflare";
  label: string;
  href: string;
};

function hasInjectedSolanaWallet() {
  if (typeof window === "undefined") {
    return false;
  }

  const walletWindow = window as typeof window & {
    phantom?: unknown;
    solana?: unknown;
    solflare?: unknown;
  };

  return Boolean(walletWindow.phantom || walletWindow.solana || walletWindow.solflare);
}

function isSafariBrowser() {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = window.navigator.userAgent;
  const isAppleDevice =
    /Macintosh/u.test(userAgent) ||
    /iP(hone|ad|od)/u.test(userAgent) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  const isSafari = /Safari/u.test(userAgent);
  const isOtherIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/u.test(userAgent);
  const isChromiumBrowser = /Chrome|Chromium|Edg|OPR/u.test(userAgent);

  return isAppleDevice && isSafari && !isOtherIosBrowser && !isChromiumBrowser;
}

export function shouldShowMobileWalletPrompt() {
  if (typeof window === "undefined") {
    return false;
  }

  const searchParams = new URLSearchParams(window.location.search);

  return (
    searchParams.get("mobile-wallet-prompt") === "1" ||
    (isSafariBrowser() && !hasInjectedSolanaWallet())
  );
}

export function createMobileWalletOpenLinks(): MobileWalletOpenLink[] {
  if (typeof window === "undefined") {
    return [];
  }

  const currentUrl = encodeURIComponent(window.location.href);
  const ref = encodeURIComponent(window.location.origin);

  return [
    {
      id: "phantom",
      label: "Open in Phantom",
      href: `https://phantom.app/ul/browse/${currentUrl}?ref=${ref}`,
    },
    {
      id: "solflare",
      label: "Open in Solflare",
      href: `https://solflare.com/ul/v1/browse/${currentUrl}?ref=${ref}`,
    },
  ];
}
