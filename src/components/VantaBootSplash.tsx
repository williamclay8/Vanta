import { BrandMark } from "@/components/BrandMark";

type VantaBootSplashProps = {
  label?: string;
};

export function VantaBootSplash({ label = "Loading Vanta" }: VantaBootSplashProps) {
  return (
    <div className="vanta-boot-splash" role="status" aria-live="polite" data-vanta-boot-splash>
      <div className="vanta-boot-splash__mark">
        <BrandMark />
      </div>
      <strong>Vanta</strong>
      <span>{label}</span>
      <div className="vanta-boot-splash__bar" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
