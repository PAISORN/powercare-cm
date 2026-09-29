import { Building2, Image as ImageIcon, PlusCircle, Save } from "lucide-react";
import {
  createOrganizationAction,
  createOrganizationMapUserAction,
  updateOrganizationAction,
  updateOrganizationMapUserAction,
} from "../../app/admin/organization/actions";
import { RoleName } from "../../modules/cm-work/cm-work-types";
import type { AdminOrganizationPageData } from "../../modules/organization/admin-organization-page-data";
import { AdminStructureTabs } from "../admin-structure-tabs";
import { OrganizationSiteMap } from "../organization-site-map";

export function AdminOrganizationWorkspace({
  data,
}: {
  data: AdminOrganizationPageData;
}) {
  const {
    canEditCompany,
    canEditPlant,
    drawerCategories,
    drawerOrganizations,
    drawerPlants,
    organization,
    organizationTree,
    plantProfile,
    query,
    roleOptions,
    scope,
    user,
    userPermissions,
    visibleHasLogo,
    visibleLogoSrc,
    visibleProfileName,
  } = data;
  return (
    <>
      <header>
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
          <Building2 aria-hidden="true" size={17} />
          Admin Organization
        </p>
        <h1 className="mt-2 text-3xl font-extrabold">ข้อมูลองค์กร</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          จัดการข้อมูลบริษัท โลโก้ และโครงสร้าง Organization / Site สำหรับใช้งานในเอกสารปิดงานและระบบหลายองค์กร
        </p>
      </header>

      <AdminStructureTabs activeTab="organization" />

      {query.saved === "1" ? (
        <p className="mt-5 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 font-semibold text-green-700 dark:text-green-300" role="status">
          บันทึกข้อมูลองค์กรเรียบร้อยแล้ว
        </p>
      ) : null}
      {query.error === "1" ? (
        <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 font-semibold text-red-700 dark:text-red-300" role="alert">
          บันทึกไม่สำเร็จ กรุณาตรวจสอบชื่อบริษัทและไฟล์โลโก้
        </p>
      ) : null}

      {query.created === "1" ? (
        <p className="mt-5 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 font-semibold text-green-700 dark:text-green-300" role="status">
          Organization created successfully. You can now create an Organization Admin for it.
        </p>
      ) : null}
      {query.created === "duplicate" ? (
        <p className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 font-semibold text-amber-700 dark:text-amber-300" role="alert">
          Organization name or code already exists.
        </p>
      ) : null}
      {query.userStatus === "created" ? (
        <p className="mt-5 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 font-semibold text-green-700 dark:text-green-300" role="status">
          สร้าง User จาก Organization Site Map เรียบร้อยแล้ว
        </p>
      ) : null}
      {query.userStatus === "duplicate" ? (
        <p className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 font-semibold text-amber-700 dark:text-amber-300" role="alert">
          Username นี้มีอยู่แล้ว กรุณาใช้ชื่ออื่น
        </p>
      ) : null}
      {query.userStatus === "quota" ? (
        <p className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 font-semibold text-amber-700 dark:text-amber-300" role="alert">
          Site นี้มีจำนวน User ถึงโควตาที่กำหนดไว้แล้ว
        </p>
      ) : null}
      {query.userStatus === "orgRequired" ? (
        <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 font-semibold text-red-700 dark:text-red-300" role="alert">
          ไม่พบ Organization สำหรับสร้าง User กรุณาตรวจสอบข้อมูลอีกครั้ง
        </p>
      ) : null}
      {query.userStatus === "inventoryScopeRequired" ? (
        <p className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 font-semibold text-amber-700 dark:text-amber-300" role="alert">
          Store Officer ที่ Active ต้องรับผิดชอบประเภทสต็อกอย่างน้อยหนึ่งประเภท
        </p>
      ) : null}
      {query.userStatus === "approvalScopeRequired" ? (
        <p className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 font-semibold text-amber-700 dark:text-amber-300" role="alert">
          Engineer ที่ Active ต้องมีประเภทใบเบิกที่อนุมัติอย่างน้อยหนึ่งประเภท
        </p>
      ) : null}

      {user.role === RoleName.ADMIN ? (
        <section className="mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
                <PlusCircle aria-hidden="true" size={17} />
                Owner Admin
              </p>
              <h2 className="mt-2 text-2xl font-extrabold">Create Organization</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Create the company/customer first. After that, create its Organization Admin from Admin Users.
              </p>
            </div>
            <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-sm font-bold text-[var(--muted)]">{organizationTree.length} organizations</span>
          </div>
          <form aria-label="Create organization" action={createOrganizationAction} className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-end">
            <label className="grid gap-1 text-sm font-semibold">
              Organization name
              <input name="name" required className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]" placeholder="Rungtiva Biomass Company Limited" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Organization code
              <input name="slug" required className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]" placeholder="rtb" />
            </label>
            <button className="min-h-12 rounded-2xl bg-[var(--primary)] px-5 font-bold text-white transition hover:bg-[var(--primary-strong)]" type="submit">
              Create Organization
            </button>
          </form>
        </section>
      ) : null}

      <OrganizationSiteMap
        categories={drawerCategories}
        createUserAction={createOrganizationMapUserAction}
        organizationName={scope.organization.name}
        organizations={drawerOrganizations}
        organizationTree={organizationTree}
        plants={drawerPlants}
        roleOptions={roleOptions}
        updateUserAction={updateOrganizationMapUserAction}
        userPermissions={userPermissions}
        viewerRole={user.role}
      />

      <section className="mt-6 grid max-w-5xl gap-6 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] md:grid-cols-[260px_minmax(0,1fr)] md:p-6">
        <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-[var(--line)] bg-[var(--soft)] p-5">
          {visibleHasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={`${visibleProfileName} logo`} className="max-h-44 w-full object-contain" src={visibleLogoSrc} />
          ) : (
            <div className="text-center text-[var(--muted)]">
              <ImageIcon aria-hidden="true" className="mx-auto" size={42} />
              <p className="mt-3 font-semibold">ยังไม่มีโลโก้</p>
            </div>
          )}
        </div>

        <form action={updateOrganizationAction} className="grid content-start gap-5">
          <div className="grid gap-4 rounded-lg border border-[var(--line)] bg-[var(--soft)] p-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">
              ชื่อ Organization ในระบบ
              <input
                className="min-h-12 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 text-base"
                defaultValue={scope.organization.name}
                disabled={!canEditCompany}
                maxLength={200}
                name="organizationName"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              รหัส Organization
              <input
                className="min-h-12 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 text-base"
                defaultValue={scope.organization.slug}
                disabled={!canEditCompany}
                maxLength={80}
                name="organizationSlug"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              ชื่อ Site
              <input
                className="min-h-12 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 text-base"
                defaultValue={plantProfile.plantName}
                disabled={!canEditPlant}
                maxLength={200}
                name="plantName"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              รหัส Site
              <input
                className="min-h-12 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 text-base"
                defaultValue={plantProfile.plantCode}
                disabled={!canEditPlant}
                maxLength={80}
                name="plantCode"
                required
              />
            </label>
            <p className="text-xs text-[var(--muted)] md:col-span-2">
              {canEditCompany
                ? "ข้อมูลส่วนนี้ใช้เป็นค่าเริ่มต้นระดับ Organization"
                : "Site Admin แก้ได้เฉพาะชื่อและข้อมูลของ Site ตัวเองเท่านั้น"}
            </p>
          </div>

          {canEditCompany ? (
            <label className="grid gap-2 text-sm font-semibold">
              ชื่อบริษัท / Organization Profile
              <input
                className="min-h-12 rounded-md border border-[var(--line)] bg-[var(--soft)] px-4 text-base"
                defaultValue={organization.companyName}
                disabled={!canEditCompany}
                maxLength={200}
                name="companyName"
                required
              />
            </label>
          ) : (
            <div className="grid gap-4 rounded-lg border border-[var(--line)] bg-[var(--soft)] p-4">
              <label className="grid gap-2 text-sm font-semibold">
                ชื่อบริษัทที่แสดงบน Dashboard ของ Site
                <input
                  className="min-h-12 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 text-base"
                  defaultValue={plantProfile.companyName ?? plantProfile.plantName}
                  maxLength={200}
                  name="siteCompanyName"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                ที่อยู่บริษัท / Site
                <textarea
                  className="min-h-24 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base"
                  defaultValue={plantProfile.address ?? ""}
                  maxLength={500}
                  name="siteAddress"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold">
                  ผู้ติดต่อ
                  <input
                    className="min-h-12 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 text-base"
                    defaultValue={plantProfile.contactName ?? ""}
                    maxLength={160}
                    name="siteContactName"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  เบอร์ติดต่อ
                  <input
                    className="min-h-12 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 text-base"
                    defaultValue={plantProfile.contactPhone ?? ""}
                    maxLength={80}
                    name="siteContactPhone"
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-semibold">
                หมายเหตุ / รายละเอียดเพิ่มเติม
                <textarea
                  className="min-h-24 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base"
                  defaultValue={plantProfile.notes ?? ""}
                  maxLength={1000}
                  name="siteNotes"
                />
              </label>
            </div>
          )}
          <label className="grid gap-2 text-sm font-semibold">
            {canEditCompany ? "อัปโหลดโลโก้บริษัท" : "อัปโหลดโลโก้ Site"}
            <input
              accept="image/png,image/jpeg,image/webp"
              className="min-h-12 rounded-md border border-[var(--line)] bg-[var(--soft)] p-2"
              disabled={canEditCompany ? !canEditCompany : !canEditPlant}
              name={canEditCompany ? "logo" : "plantLogo"}
              type="file"
            />
            <span className="font-normal text-[var(--muted)]">รองรับ PNG, JPG และ WebP ขนาดไม่เกิน 2 MB ไฟล์ใหม่จะแทนที่ไฟล์เดิม</span>
          </label>
          <button className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md bg-[var(--primary)] px-5 font-bold text-white transition hover:bg-[var(--primary-strong)]" type="submit">
            <Save aria-hidden="true" size={18} />
            {canEditCompany ? "บันทึกข้อมูลองค์กร" : "บันทึกข้อมูล Site"}
          </button>
        </form>
      </section>
    </>
  );
}
