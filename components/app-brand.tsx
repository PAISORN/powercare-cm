import packageJson from "../package.json";

export const APP_VERSION = `v${packageJson.version}`;

export function AppBrand({
  className = "",
  versionClassName = "",
}: {
  className?: string;
  versionClassName?: string;
}) {
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-1.5 ${className}`.trim()}>
      <span>PowerCare.CM</span>
      <span className={`text-[0.58em] font-bold opacity-70 ${versionClassName}`.trim()}>{APP_VERSION}</span>
    </span>
  );
}
