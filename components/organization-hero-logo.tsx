import { Building2 } from "lucide-react";

export function OrganizationHeroLogo({ companyName, hasLogo, logoSrc = "/organization-logo" }: { companyName: string; hasLogo: boolean; logoSrc?: string }) {
  return (
    <div className="shrink-0 rounded-2xl bg-white/15 p-2 text-white backdrop-blur sm:p-3" aria-label="Organization logo">
      {hasLogo ? (
        <img
          alt={`${companyName} logo`}
          className="h-14 w-14 object-contain sm:h-16 sm:w-16 lg:h-20 lg:w-20"
          src={logoSrc}
        />
      ) : (
        <span className="grid h-14 w-14 place-items-center rounded-xl bg-white/15 sm:h-16 sm:w-16 lg:h-20 lg:w-20">
          <Building2 aria-hidden="true" size={30} />
        </span>
      )}
    </div>
  );
}
