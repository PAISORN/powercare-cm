import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Asset image upload", () => {
  it("shows an explicit save image button for editable Assets", () => {
    const source = readFileSync("app/assets/[id]/page.tsx", "utf8");
    expect(source).toContain("บันทึกรูปภาพ");
    expect(source).toContain('type="submit"');
    expect(source).toContain('aria-label="เลือกรูปภาพ Asset"');
    expect(source).toContain("form action={uploadAssetImage}");
  });

  it("separates Parent and Children into responsive hierarchy tabs", () => {
    const source = readFileSync("app/assets/[id]/page.tsx", "utf8");
    expect(source).toContain('label:"Parent"');
    expect(source).toContain('label:`Child ${index+1}`');
    expect(source).toContain('className="mb-4 mt-4 grid grid-cols-2');
    expect(source).toContain("description:child.label");
  });

  it("shows exact-Asset PM upcoming, derived overdue, history, team, notes, and linked CM", () => {
    const source = readFileSync("app/assets/[id]/page.tsx", "utf8");
    expect(source).toContain("where:{assetId:asset.id,plantId:asset.plantId}");
    expect(source).not.toContain("parentId:asset.id,plantId:asset.plantId");
    expect(source).toContain('work.pmPlan.plannedDateKey<todayDateKey');
    expect(source).toContain('work.status==="PLANNED"||work.status==="IN_PROGRESS"');
    expect(source).toContain('work.status==="COMPLETED"||work.status==="CANCELED"');
    expect(source).toContain("work.assignees.map");
    expect(source).toContain("work.resultNote");
    expect(source).toContain("work.originatingCmWork");
    expect(source).toContain('href={`/dashboardpm/work/${work.id}?organizationId=${asset.plant.organizationId}&plantId=${asset.plantId}`}');
  });

  it("scopes the Asset and both CM/PM histories through the authoritative user scope", () => {
    const source = readFileSync("app/assets/[id]/page.tsx", "utf8");
    expect(source).toContain("buildUserOperationalScope(user)");
    expect(source).toContain("db.asset.findFirst({where:{id,...accessScope}");
    expect(source).toContain("where:{assetId:asset.id,plantId:asset.plantId}");
  });

  it("shows only the 15 R8 headings in the Asset identity table", () => {
    const source = readFileSync("app/assets/[id]/page.tsx", "utf8");
    const headings = ["SYSTEM", "MAIN ASSET", "SUB-ASSET", "PART-ASSET", "CODE ASSET", "ASSET LEVEL", "AREA / ZONE", "ASSET TYPE", "DISCIPLINE", "CRITICALITY", "MANUFACTURER", "MODEL / TYPE", "SERIAL NO.", "STATUS", "KEY SPECIFICATION"];
    for (const heading of headings) expect(source).toContain('["' + heading + '",');
    for (const removed of ["Parent Asset", "Tag / KKS", "Registration Code", "Asset Class (legacy)", "Asset Family (legacy)", "Migration Status", "วันที่ติดตั้ง", "วันที่เริ่มใช้งาน", "ข้อมูลทางเทคนิค"]) expect(source).not.toContain(removed);
    expect(source).toContain("resolveAssetR8Names(asset)");
    expect(source).toContain("parent:{include:{family:true,assetClass:true,assetType:true,parent:true}}");
    expect(source).toContain("<InfoTable items={r8InfoItems}/>");
  });
});
