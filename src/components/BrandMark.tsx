export function BrandMark() {
  return (
    <svg className="brand-mark" aria-hidden="true" viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="brandMarkGradient" x1="0" y1="0" x2="100" y2="100">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#00e5c8" />
          <stop offset="100%" stopColor="#00b89e" />
        </linearGradient>
        <filter id="brandMarkGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M18 18 L50 82 L50 58 L34 18 Z"
        fill="#0a1f24"
        stroke="url(#brandMarkGradient)"
        strokeWidth="2"
        strokeLinejoin="round"
        filter="url(#brandMarkGlow)"
      />
      <path
        d="M82 18 L50 82 L50 58 L66 18 Z"
        fill="#061618"
        stroke="url(#brandMarkGradient)"
        strokeWidth="2"
        strokeLinejoin="round"
        filter="url(#brandMarkGlow)"
      />
      <path d="M34 18 L50 58 L66 18 Z" fill="#020305" />
      <circle cx="50" cy="82" r="3" fill="#00e5c8" filter="url(#brandMarkGlow)" />
    </svg>
  );
}
