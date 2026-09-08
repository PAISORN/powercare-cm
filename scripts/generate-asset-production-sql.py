import csv, hashlib, sqlite3
from pathlib import Path
DB="prisma/dev.db"; OUT=Path("prisma/supabase-migrations/20260908000200_replace_assets_and_remap_cm.sql"); PROD_PLANT="primary-plant"
c=sqlite3.connect(DB); c.row_factory=sqlite3.Row
LOCAL_PLANT=c.execute("SELECT id FROM Plant WHERE upper(code)='RTB'").fetchone()[0]
def lit(v,boolean=False):
    if v is None:return "NULL"
    if boolean:return "TRUE" if bool(v) else "FALSE"
    if isinstance(v,(int,float)):return str(v)
    return "'"+str(v).replace("'","''")+"'"
def ident(s):return '"'+s.replace('"','""')+'"'
def query(sql,args=()):return [dict(r) for r in c.execute(sql,args)]
def scoped(table):return query(f'SELECT * FROM {ident(table)} WHERE "plantId"=?',(LOCAL_PLANT,))
def insert_many(table,data,bools=set(),transforms=None):
    if not data:return ""
    cols=list(data[0]); values=[]
    for row in data:
        values.append("("+",".join((transforms[col](row) if transforms and col in transforms else lit(row[col],col in bools)) for col in cols)+")")
    return f'INSERT INTO {ident(table)} ({",".join(map(ident,cols))}) VALUES\n'+",\n".join(values)+";\n"
mapping=list(csv.DictReader(open("prisma/data/production-cm-asset-mapping.csv",encoding="utf-8-sig")))
assets=scoped("Asset"); classes=scoped("AssetClass"); types=scoped("AssetType"); systems=scoped("AssetSystem"); sequences=scoped("AssetCodeSequence")
assert len(mapping)==22 and all(r["match_status"]=="CONFIRMED" for r in mapping)
assert (len(assets),len(classes),len(types),len(systems),len(sequences))==(880,4,64,15,64)
zone_by_id={r["id"]:r["name"] for r in query('SELECT id,name FROM Zone WHERE "plantId"=?',(LOCAL_PLANT,))}
zone_names=sorted({zone_by_id[a["zoneId"]] for a in assets if a["zoneId"]})
s=[]
s.append("BEGIN;\nSET LOCAL lock_timeout = '30s';\nSET LOCAL statement_timeout = '10min';\nLOCK TABLE \"CmWork\", \"Asset\" IN SHARE ROW EXCLUSIVE MODE;\n")
s.append('CREATE TABLE asset_refactor_backup_20260908."Asset_at_replace" AS TABLE public."Asset";\nCREATE TABLE asset_refactor_backup_20260908."CmWork_at_replace" AS TABLE public."CmWork";\n')
s.append('CREATE TEMP TABLE "_cm_asset_map" ("oldAssetId" TEXT PRIMARY KEY, "newAssetId" TEXT NOT NULL);\nINSERT INTO "_cm_asset_map" ("oldAssetId","newAssetId") VALUES\n'+",\n".join(f"({lit(r['old_asset_id'])},{lit(r['new_asset_id'])})" for r in mapping)+";\n")
s.append("""DO $$ BEGIN
IF EXISTS (SELECT 1 FROM "CmWork" c JOIN "Asset" a ON a."id"=c."assetId" WHERE a."plantId"='primary-plant' AND NOT EXISTS (SELECT 1 FROM "_cm_asset_map" m WHERE m."oldAssetId"=a."id")) THEN RAISE EXCEPTION 'Linked CM Asset is missing from confirmed mapping'; END IF;
END $$;
CREATE TEMP TABLE "_cm_work_remap" AS SELECT c."id" "cmWorkId",m."newAssetId" FROM "CmWork" c JOIN "Asset" a ON a."id"=c."assetId" JOIN "_cm_asset_map" m ON m."oldAssetId"=a."id" WHERE a."plantId"='primary-plant';
UPDATE "CmWork" c SET "assetCodeSnapshot"=a."code","assetNameSnapshot"=COALESCE(a."nameTh",a."nameEn"),"assetId"=NULL FROM "Asset" a WHERE c."assetId"=a."id" AND a."plantId"='primary-plant';
DELETE FROM "PmGroupAsset" WHERE "plantId"='primary-plant';
UPDATE "CmWork" SET "originatingPmWorkId"=NULL WHERE "originatingPmWorkId" IN (SELECT "id" FROM "PmWork" WHERE "plantId"='primary-plant');
DELETE FROM "PmWorkAssignee" WHERE "pmWorkId" IN (SELECT "id" FROM "PmWork" WHERE "plantId"='primary-plant');
DELETE FROM "PmWorkSourceGroup" WHERE "pmWorkId" IN (SELECT "id" FROM "PmWork" WHERE "plantId"='primary-plant');
DELETE FROM "PmWork" WHERE "plantId"='primary-plant';
UPDATE "Asset" SET "parentId"=NULL WHERE "plantId"='primary-plant';
DELETE FROM "AssetTechnicalValue" v USING "Asset" a WHERE v."assetId"=a."id" AND a."plantId"='primary-plant';
DELETE FROM "AssetDocument" d USING "Asset" a WHERE d."assetId"=a."id" AND a."plantId"='primary-plant';
DELETE FROM "Asset" WHERE "plantId"='primary-plant';
DELETE FROM "AssetCodeSequence" WHERE "plantId"='primary-plant'; DELETE FROM "AssetSequence" WHERE "plantId"='primary-plant';
DELETE FROM "AssetTechnicalField" f USING "AssetType" t WHERE f."assetTypeId"=t."id" AND t."plantId"='primary-plant';
DELETE FROM "AssetType" WHERE "plantId"='primary-plant'; DELETE FROM "AssetFamily" WHERE "plantId"='primary-plant'; DELETE FROM "AssetClass" WHERE "plantId"='primary-plant'; DELETE FROM "AssetSystem" WHERE "plantId"='primary-plant';
""")
for name in zone_names:
    zid="asset-refactor-zone-"+hashlib.sha1(name.encode()).hexdigest()[:16]
    s.append(f'INSERT INTO "Zone" ("id","plantId","name","active","createdAt","updatedAt") VALUES ({lit(zid)},\'{PROD_PLANT}\',{lit(name)},TRUE,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("plantId","name") DO UPDATE SET "active"=TRUE,"updatedAt"=CURRENT_TIMESTAMP;\n')
s.append(insert_many("AssetSystem",systems,{"active"},{"plantId":lambda r:lit(PROD_PLANT)})); s.append(insert_many("AssetClass",classes,{"active"},{"plantId":lambda r:lit(PROD_PLANT)})); s.append(insert_many("AssetType",types,{"active"},{"plantId":lambda r:lit(PROD_PLANT)}))
cols=list(assets[0]); vals=[]; parent_updates=[]
for a in assets:
    row=[]
    for col in cols:
        if col=="plantId":row.append(lit(PROD_PLANT))
        elif col=="parentId":row.append("NULL")
        elif col=="zoneId":
            name=zone_by_id.get(a[col]); row.append("NULL" if not name else f'(SELECT "id" FROM "Zone" WHERE "plantId"={lit(PROD_PLANT)} AND "name"={lit(name)})')
        else:row.append(lit(a[col]))
    vals.append("("+",".join(row)+")")
    if a["parentId"]:parent_updates.append(f'UPDATE "Asset" SET "parentId"={lit(a["parentId"])} WHERE "id"={lit(a["id"])};')
s.append(f'INSERT INTO "Asset" ({",".join(map(ident,cols))}) VALUES\n'+",\n".join(vals)+";\n"+"\n".join(parent_updates)+"\n")
s.append(insert_many("AssetCodeSequence",sequences,set(),{"plantId":lambda r:lit(PROD_PLANT)}))
s.append("""UPDATE "CmWork" c SET "assetId"=r."newAssetId" FROM "_cm_work_remap" r WHERE c."id"=r."cmWorkId";
DO $$ DECLARE ac INT;cc INT;sc INT;tc INT;qc INT;rc INT;lc INT; BEGIN
SELECT COUNT(*) INTO ac FROM "Asset" WHERE "plantId"='primary-plant'; SELECT COUNT(*) INTO cc FROM "AssetClass" WHERE "plantId"='primary-plant'; SELECT COUNT(*) INTO sc FROM "AssetSystem" WHERE "plantId"='primary-plant'; SELECT COUNT(*) INTO tc FROM "AssetType" WHERE "plantId"='primary-plant'; SELECT COUNT(*) INTO qc FROM "AssetCodeSequence" WHERE "plantId"='primary-plant'; SELECT COUNT(*) INTO rc FROM "_cm_work_remap"; SELECT COUNT(*) INTO lc FROM "CmWork" c JOIN "Asset" a ON a."id"=c."assetId" WHERE a."plantId"='primary-plant';
IF ac<>880 OR cc<>4 OR sc<>15 OR tc<>64 OR qc<>64 THEN RAISE EXCEPTION 'Asset count verification failed: %, %, %, %, %',ac,cc,sc,tc,qc; END IF; IF rc<>lc THEN RAISE EXCEPTION 'CM remap verification failed: % vs %',rc,lc; END IF;
IF EXISTS (SELECT 1 FROM "Asset" WHERE "plantId"='primary-plant' GROUP BY "code" HAVING COUNT(*)>1) THEN RAISE EXCEPTION 'Duplicate Asset Code'; END IF;
IF EXISTS (SELECT 1 FROM "Asset" WHERE "plantId"='primary-plant' AND NOT ("code" ~ '^MC-[A-Z]{3}-[0-9]{3}$' OR "code" IN ('MC-ARC-5001','MC-ARC-5002','MC-ARC-5003','MC-ARC-5004','MC-ARC-5005','MC-ARC-5006','MC-ARC-5007'))) THEN RAISE EXCEPTION 'Invalid Asset Code'; END IF;
IF EXISTS (SELECT 1 FROM "Asset" ch LEFT JOIN "Asset" p ON p."id"=ch."parentId" AND p."plantId"=ch."plantId" WHERE ch."plantId"='primary-plant' AND ch."parentId" IS NOT NULL AND p."id" IS NULL) THEN RAISE EXCEPTION 'Orphan parent'; END IF;
IF EXISTS (SELECT 1 FROM "CmWork" c JOIN "_cm_work_remap" r ON r."cmWorkId"=c."id" WHERE c."assetId"<>r."newAssetId" OR c."assetCodeSnapshot" IS NULL OR c."assetNameSnapshot" IS NULL) THEN RAISE EXCEPTION 'CM verification failed'; END IF;
END $$;
COMMIT;
""")
OUT.write_text("".join(s),encoding="utf-8",newline="\n")
print({"path":str(OUT),"bytes":OUT.stat().st_size,"assets":len(assets),"classes":len(classes),"zones":len(zone_names),"mappings":len(mapping)})
