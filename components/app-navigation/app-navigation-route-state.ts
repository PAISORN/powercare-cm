import { isActivePath, type AppLink } from "./app-navigation-model";

export function getOpenSectionsForRoute(
  links: AppLink[],
  pathname: string,
  searchParams?: Pick<URLSearchParams, "get"> | null,
) {
  const openSections: Record<string, boolean> = {};
  const sectionParents = new Map(
    links
      .filter((link) => link.kind === "section" && link.sectionId)
      .map((link) => [link.sectionId as string, link.parentSectionId]),
  );

  const openParentChain = (sectionId?: string) => {
    if (!sectionId || openSections[sectionId]) return;
    openSections[sectionId] = true;
    openParentChain(sectionParents.get(sectionId));
  };

  for (const link of links) {
    if (
      link.parentSectionId &&
      link.href &&
      !link.disabled &&
      isActivePath(pathname, link.href, searchParams)
    ) {
      openParentChain(link.parentSectionId);
    }
  }

  return openSections;
}

export function isChildOfSection(
  links: AppLink[],
  parentSectionId: string | undefined,
  sectionId: string,
): boolean {
  if (!parentSectionId) return false;
  if (parentSectionId === sectionId) return true;
  const parentSection = links.find(
    (link) => link.kind === "section" && link.sectionId === parentSectionId,
  );
  return isChildOfSection(links, parentSection?.parentSectionId, sectionId);
}
