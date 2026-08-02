import * as XLSX from "xlsx";
import { getCurrentUser } from "../../../lib/session";
import { db } from "../../../lib/db";
import { canViewAssets } from "../../../modules/auth/permission";
import { resolveAssetScope } from "../../../modules/assets/asset-scope";

export async function GET(request: Request) {
  const user=await getCurrentUser(); if(!user||!canViewAssets(user)) return new Response("Unauthorized",{status:401});
  const url=new URL(request.url); const scope=await resolveAssetScope(user,{organizationId:url.searchParams.get("organizationId")||undefined,plantId:url.searchParams.get("plantId")||undefined});
  const assets=await db.asset.findMany({where:{plantId:scope.plant.id,registrationStatus:"ACTIVE"},include:{family:true,assetClass:true,assetType:true,zone:true,parent:true},orderBy:{code:"asc"}});
  const rows=assets.map(a=>({"Parent Code":a.parent?.code||"","Family Code":a.family.code,"Component Code":a.componentCode||"","Asset Class":a.assetClass.nameTh,"Asset Type":a.assetType?.code||"","Asset Code":a.code||"","ชื่อภาษาไทย":a.nameTh,"English Name":a.nameEn||"","Zone":a.zone?.name||"","Installation Location":a.installationLocation||"","Manufacturer":a.manufacturer||"","Model":a.model||"","Serial Number":a.serialNumber||"","Operating Status":a.operatingStatus,"Criticality":a.criticality}));
  const workbook=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook,XLSX.utils.json_to_sheet(rows),"Assets");
  const bytes=XLSX.write(workbook,{type:"buffer",bookType:"xlsx"});
  return new Response(bytes,{headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":`attachment; filename="assets-${scope.plant.code}.xlsx"`}});
}
