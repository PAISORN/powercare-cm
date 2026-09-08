import csv, re, sqlite3
from difflib import SequenceMatcher
from pathlib import Path

root = Path("docs/asset-refactor/production-cm-mapping")
old = list(csv.DictReader((root / "production-assets-with-cm.csv").open(encoding="utf-8-sig")))
con = sqlite3.connect("prisma/dev.db")
con.row_factory = sqlite3.Row
new = [dict(r) for r in con.execute('''
SELECT a.id, a.code, a."registrationCode", a."tagKks", a."nameTh", a."nameEn",
       a.manufacturer, a.model, a."serialNumber", z.name AS zone_name,
       t."nameEn" AS asset_type
FROM Asset a
LEFT JOIN Zone z ON z.id = a."zoneId"
LEFT JOIN AssetType t ON t.id = a."assetTypeId"
''')]

def norm(v): return re.sub(r"[^A-Z0-9]", "", (v or "").upper())
def ratio(a,b): return SequenceMatcher(None, norm(a), norm(b)).ratio() if a and b else 0

fields = ["old_asset_id","old_asset_code","old_asset_name","cm_count","cm_numbers","new_asset_id","new_asset_code","new_registration_code","new_tag_kks","new_asset_name","match_status","match_basis","score"]
results=[]
for o in old:
    ranked=[]
    for n in new:
        score=0; basis=[]
        if norm(o["old_asset_code"]) and norm(o["old_asset_code"]) == norm(n["registrationCode"]): score+=100; basis.append("REGISTRATION_CODE")
        if norm(o["old_asset_code"]) and norm(o["old_asset_code"]) == norm(n["tagKks"]): score+=95; basis.append("TAG_KKS")
        if o["serial_number"] and norm(o["serial_number"]) == norm(n["serialNumber"]): score+=45; basis.append("SERIAL")
        name_score=ratio(o["old_asset_name"],n["nameTh"] or n["nameEn"])
        if name_score == 1: score+=60; basis.append("NAME_EXACT")
        elif name_score >= .82: score+=round(name_score*35); basis.append("NAME_SIMILAR")
        if o["model"] and norm(o["model"]) == norm(n["model"]): score+=20; basis.append("MODEL")
        if o["zone_name"] and norm(o["zone_name"]) == norm(n["zone_name"]): score+=10; basis.append("AREA")
        if score: ranked.append((score,n,basis))
    ranked.sort(key=lambda x:x[0],reverse=True)
    best=ranked[0] if ranked else None
    tied=best and sum(1 for x in ranked if x[0]==best[0])>1
    status="UNMATCHED" if not best or best[0]<50 else ("AMBIGUOUS" if tied else ("AUTO_MATCH" if best[0]>=100 else "REVIEW"))
    n=best[1] if best else {}
    results.append({**{k:o[k] for k in fields if k in o},"new_asset_id":n.get("id","") ,"new_asset_code":n.get("code","") ,"new_registration_code":n.get("registrationCode","") or "","new_tag_kks":n.get("tagKks","") or "","new_asset_name":n.get("nameTh","") or n.get("nameEn","") or "","match_status":status,"match_basis":"+".join(best[2]) if best else "","score":best[0] if best else 0})
with (root / "production-cm-asset-mapping.csv").open("w",newline="",encoding="utf-8-sig") as f:
    w=csv.DictWriter(f,fieldnames=fields); w.writeheader(); w.writerows(results)
from collections import Counter
print(dict(Counter(r["match_status"] for r in results)))
for r in results:
    print(r["old_asset_code"],"=>",r["new_asset_code"],r["match_status"],r["score"],r["match_basis"])
