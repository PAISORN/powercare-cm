"use client";

import { useMemo, useState } from "react";

type CategoryOption = { id: string; code: string | null; name: string; active?: boolean };
type MaterialGroupOption = { id: string; categoryId: string; code: string; name: string; active?: boolean };

export function SparePartClassificationFields({
  categories,
  groups,
  defaultCategoryId = "",
  defaultMaterialGroupId = "",
  filter = false,
  className,
}: {
  categories: CategoryOption[];
  groups: MaterialGroupOption[];
  defaultCategoryId?: string;
  defaultMaterialGroupId?: string;
  filter?: boolean;
  className: string;
}) {
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [materialGroupId, setMaterialGroupId] = useState(defaultMaterialGroupId);
  const visibleGroups = useMemo(
    () => groups.filter((group) => group.categoryId === categoryId),
    [categoryId, groups],
  );
  const emptyLabel = filter ? "ทั้งหมด" : "เลือก";

  return (
    <>
      <label className="grid gap-1.5 text-sm font-bold">
        หมวดหมู่
        <select
          className={className}
          name="categoryId"
          onChange={(event) => {
            setCategoryId(event.target.value);
            setMaterialGroupId("");
          }}
          required={!filter}
          value={categoryId}
        >
          <option disabled={!filter} value="">{emptyLabel}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.code ? `${category.code} · ` : ""}{category.name}{category.active === false ? " (ไม่ใช้งาน)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-bold">
        กลุ่มอะไหล่/วัสดุ
        <select
          className={className}
          disabled={!categoryId}
          name="materialGroupId"
          required={!filter}
          value={materialGroupId}
          onChange={(event) => setMaterialGroupId(event.target.value)}
        >
          <option disabled={!filter} value="">{categoryId ? emptyLabel : "เลือกหมวดหมู่ก่อน"}</option>
          {visibleGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.code} · {group.name}{group.active === false ? " (ไม่ใช้งาน)" : ""}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
