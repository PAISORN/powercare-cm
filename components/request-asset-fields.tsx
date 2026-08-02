"use client";

import { useMemo, useState } from "react";
import { AssetSearchField, type RepairAssetOption } from "./asset-search-field";

type ZoneOption = { id: string; name: string };

export function RequestAssetFields({ zones, assets }: { zones: ZoneOption[]; assets: RepairAssetOption[] }) {
  const [zoneId, setZoneId] = useState("");
  const filteredAssets = useMemo(() => assets.filter((asset) => asset.zoneId === zoneId), [assets, zoneId]);

  return <>
    <label className="grid gap-1 text-sm font-bold text-[var(--ink)]">Zone
      <select
        className="min-h-12 cursor-pointer rounded-md border bg-white p-3 text-black disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!zones.length}
        name="zoneId"
        onChange={(event)=>setZoneId(event.target.value)}
        required
        value={zoneId}
      >
        <option value="">{zones.length?"เลือก Zone":"ยังไม่มี Zone สำหรับ Site นี้"}</option>
        {zones.map((zone)=><option key={zone.id} value={zone.id}>{zone.name}</option>)}
      </select>
    </label>
    <AssetSearchField assets={filteredAssets} disabled={!zoneId} key={zoneId||"no-zone"}/>
  </>;
}
