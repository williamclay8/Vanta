import { useEffect, useRef, useState } from "react";

type AnimatedNumberProps = {
  className?: string;
  durationMs?: number;
  format: (value: number) => string;
  value: number;
};

export function AnimatedNumber({
  className,
  durationMs = 420,
  format,
  value,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef<number>();

  useEffect(() => {
    const from = fromRef.current;
    const to = value;

    if (from === to) {
      setDisplayValue(to);
      return undefined;
    }

    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      const next = from + (to - from) * eased;
      setDisplayValue(next);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
        setDisplayValue(to);
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [durationMs, value]);

  return (
    <span className={["v-num", className].filter(Boolean).join(" ")}>{format(displayValue)}</span>
  );
}
