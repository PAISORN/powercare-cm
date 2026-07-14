"use client";

import { useEffect } from "react";
import { RoleName } from "../modules/cm-work/cm-work-types";

export function AdminUserRoleScopeController({
  formId,
  organizationName,
}: {
  formId: string;
  organizationName: string;
}) {
  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;

    const roleSelect = form.querySelector<HTMLSelectElement>('select[name="role"]');
    const departmentInput = form.querySelector<HTMLInputElement>('input[name="department"]');
    const organizationSelect = form.querySelector<HTMLSelectElement>('select[name="organizationId"]');
    const siteSelect = form.querySelector<HTMLSelectElement>('select[name="plantId"]');
    const organizationScopeControl = form.querySelector<HTMLElement>("[data-organization-admin-scope-control]");
    const siteScopeControl = form.querySelector<HTMLElement>("[data-site-scope-control]");
    const categoryScopeControl = form.querySelector<HTMLElement>("[data-category-scope-control]");
    const reloadsSiteOptions = organizationSelect?.dataset.reloadsSiteOptions === "true";
    const filtersScopeOptions = organizationSelect?.dataset.filtersScopeOptions === "true";

    const setScopeDisabled = (element: HTMLElement | null, disabled: boolean) => {
      if (!element) return;
      element.classList.toggle("opacity-50", disabled);
      element.classList.toggle("pointer-events-none", disabled);
      element.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select").forEach((input) => {
        input.disabled = disabled;
      });
    };

    const filterScopeOptions = (organizationAdminSelected: boolean) => {
      if (!filtersScopeOptions || !organizationSelect) return;
      const selectedOrganizationId = organizationSelect.value;

      siteSelect?.querySelectorAll<HTMLOptionElement>("option").forEach((option) => {
        const optionOrganizationId = option.dataset.organizationId || "";
        const hidden = Boolean(option.value && optionOrganizationId && optionOrganizationId !== selectedOrganizationId);
        option.hidden = hidden;
        option.disabled = hidden;
      });
      if (siteSelect?.selectedOptions[0]?.hidden || siteSelect?.selectedOptions[0]?.disabled) {
        siteSelect.value = "";
      }

      categoryScopeControl
        ?.querySelectorAll<HTMLLabelElement>("[data-category-organization-id]")
        .forEach((label) => {
          const categoryOrganizationId = label.dataset.categoryOrganizationId || "";
          const hidden = Boolean(categoryOrganizationId && categoryOrganizationId !== selectedOrganizationId);
          label.hidden = hidden;
          label.classList.toggle("hidden", hidden);
          label.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
            input.disabled = organizationAdminSelected || hidden;
            if (hidden) input.checked = false;
          });
        });
    };

    const applyRoleScope = () => {
      const organizationAdminSelected = roleSelect?.value === RoleName.ORGANIZATION_ADMIN;
      const selectedOrganizationName = organizationSelect?.selectedOptions[0]?.textContent?.trim() || organizationName;

      if (departmentInput) {
        if (organizationAdminSelected) departmentInput.value = selectedOrganizationName;
        departmentInput.readOnly = organizationAdminSelected;
        departmentInput.placeholder = organizationAdminSelected ? selectedOrganizationName : "หน่วยงาน";
      }

      setScopeDisabled(organizationScopeControl, false);
      setScopeDisabled(siteScopeControl, organizationAdminSelected);
      setScopeDisabled(categoryScopeControl, organizationAdminSelected);
      filterScopeOptions(organizationAdminSelected);
    };

    const reloadSiteOptionsForOrganization = () => {
      if (!reloadsSiteOptions || !organizationSelect) return;
      const nextOrganizationId = organizationSelect.value;
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.get("organizationId") === nextOrganizationId) return;
      if (nextOrganizationId) {
        currentUrl.searchParams.set("organizationId", nextOrganizationId);
      } else {
        currentUrl.searchParams.delete("organizationId");
      }
      currentUrl.searchParams.delete("plantId");
      window.location.href = currentUrl.toString();
    };

    const handleOrganizationChange = () => {
      applyRoleScope();
      reloadSiteOptionsForOrganization();
    };

    applyRoleScope();
    roleSelect?.addEventListener("change", applyRoleScope);
    organizationSelect?.addEventListener("change", handleOrganizationChange);
    return () => {
      roleSelect?.removeEventListener("change", applyRoleScope);
      organizationSelect?.removeEventListener("change", handleOrganizationChange);
    };
  }, [formId, organizationName]);

  return null;
}
