import packageJson from "../package.json";

export const APP_VERSION = `V.${packageJson.version}`;

export function AppBrand({
  className = "",
  versionClassName = "",
  showMark = true,
}: {
  className?: string;
  versionClassName?: string;
  showMark?: boolean;
}) {
  return (
    <span className={`app-brand inline-flex flex-wrap items-center gap-1.5 ${className}`.trim()}>
      {showMark ? (
        <img
          alt=""
          aria-hidden="true"
          className="app-brand-mark h-[1.65em] w-[1.65em] shrink-0 object-contain"
          src="/brand/powercare-mark.png"
        />
      ) : null}
      <span className="sr-only">PowerCare</span>
      <span className="inline-flex items-baseline font-extrabold italic">
        <span aria-hidden="true" className="app-brand-power">Power</span>
        <span aria-hidden="true" className="app-brand-care">Care</span>
      </span>
      <span className={`text-[0.58em] font-bold opacity-70 ${versionClassName}`.trim()}>{APP_VERSION}</span>
    </span>
  );
}
