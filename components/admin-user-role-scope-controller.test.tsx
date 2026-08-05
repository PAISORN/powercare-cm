import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminUserRoleScopeController } from "./admin-user-role-scope-controller";

describe("AdminUserRoleScopeController", () => {
  it("shows only categories for the selected organization and site", () => {
    const { container } = render(
      <form id="user-scope-form">
        <AdminUserRoleScopeController formId="user-scope-form" organizationName="MITRPHOL" />
        <select data-filters-scope-options="true" defaultValue="org-1" name="organizationId">
          <option value="org-1">MITRPHOL</option>
          <option value="org-2">OTHER</option>
        </select>
        <select defaultValue="" name="plantId">
          <option value="">ไม่ผูก Site</option>
          <option data-organization-id="org-1" value="plant-1">Site 1</option>
          <option data-organization-id="org-1" value="plant-2">Site 2</option>
        </select>
        <select defaultValue="TECHNICIAN" name="role"><option value="TECHNICIAN">Technician</option></select>
        <div data-category-scope-control>
          <label data-category-organization-id="org-1" data-category-plant-id="plant-1"><input name="categoryIds" type="checkbox" />งานเครื่องกล</label>
          <label data-category-organization-id="org-1" data-category-plant-id="plant-2"><input name="categoryIds" type="checkbox" />งานเครื่องกล</label>
          <label data-category-organization-id="org-1" data-category-plant-id=""><input name="categoryIds" type="checkbox" />ส่วนกลาง</label>
          <label data-category-organization-id="org-2" data-category-plant-id="plant-3"><input name="categoryIds" type="checkbox" />องค์กรอื่น</label>
        </div>
      </form>,
    );

    const siteSelect = container.querySelector<HTMLSelectElement>('select[name="plantId"]')!;
    const labels = [...container.querySelectorAll<HTMLLabelElement>("[data-category-plant-id]")];
    expect(labels.map((label) => label.hidden)).toEqual([true, true, false, true]);

    fireEvent.change(siteSelect, { target: { value: "plant-1" } });
    expect(labels.map((label) => label.hidden)).toEqual([false, true, false, true]);

    fireEvent.change(siteSelect, { target: { value: "plant-2" } });
    expect(labels.map((label) => label.hidden)).toEqual([true, false, false, true]);
  });
});
