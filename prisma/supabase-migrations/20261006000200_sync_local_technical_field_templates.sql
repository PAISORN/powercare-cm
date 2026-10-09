-- Generated from the Local primary-plant Technical Field Templates.
-- Source rows: 116; Asset Types: 21; SHA-256: b49fb53751901054d4be2c993449946a71f3fcf3cee810b444ac2385b23efb29
-- Excluded Local-only legacy Instrument sub-types: CON, DPT, FIC, LET, PHT, PSH, PTT, QTC, RTD, TDS, TTT, VIB (66 rows).
-- Merge-only migration: Production-only templates are not deleted and existing IDs are preserved.
BEGIN;
SET LOCAL lock_timeout = '30s';
SET LOCAL statement_timeout = '10min';
LOCK TABLE "Plant", "AssetType", "AssetTechnicalField", "AssetTechnicalValue" IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='AssetTechnicalField' AND column_name='helpText'
  ) THEN
    RAISE EXCEPTION 'Production schema is missing AssetTechnicalField.helpText';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='AssetTechnicalField' AND column_name='indicatorText'
  ) THEN
    RAISE EXCEPTION 'Production schema is missing AssetTechnicalField.indicatorText';
  END IF;
  IF (SELECT COUNT(*) FROM "Plant" WHERE "id"='primary-plant' AND lower("code")='rtb') <> 1 THEN
    RAISE EXCEPTION 'Production target Plant identity does not match primary-plant/rtb';
  END IF;
END $$;

CREATE TEMP TABLE "_technical_field_source" (
  "plantCode" TEXT NOT NULL,
  "typeCode" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "labelTh" TEXT NOT NULL,
  "labelEn" TEXT,
  "dataType" TEXT NOT NULL,
  "unit" TEXT,
  "helpText" TEXT,
  "indicatorText" TEXT,
  "optionsJson" TEXT,
  "required" BOOLEAN NOT NULL,
  "active" BOOLEAN NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "newId" TEXT NOT NULL,
  PRIMARY KEY ("plantCode", "typeCode", "key")
) ON COMMIT DROP;

INSERT INTO "_technical_field_source" VALUES
('rtb','BAR','field_985dbd5a','เสียง Noise',NULL,'SELECT',NULL,NULL,NULL,'["Normal","Abnormal"]',TRUE,TRUE,0,'atf-local-544d4a3d8e818b4d7c97e923'),
('rtb','BAR','vibration_fcba1e99','การสั่น Vibration',NULL,'SELECT',NULL,NULL,NULL,'["Normal","Abnormal"]',TRUE,TRUE,1,'atf-local-1cbe29590ad0b8b5250c5aa5'),
('rtb','BAR','temperature_8970f428','อุณหภูมิ Temperature',NULL,'NUMBER','°c','0-85°c',NULL,NULL,TRUE,TRUE,2,'atf-local-785855883a925f81ade35475'),
('rtb','BAR','leakage_62bae059','การรั่ว Leakage',NULL,'SELECT',NULL,NULL,NULL,'["รั่ว","ไม่รั่ว"]',TRUE,TRUE,3,'atf-local-a35c9d716833ada0325d60ad'),
('rtb','BAR','visual_check_ae900546','ตรวจทั่วไป Visual Check',NULL,'SELECT',NULL,NULL,NULL,'["OK","Not OK"]',TRUE,TRUE,4,'atf-local-20ac12f9669ad1122c83b825'),
('rtb','BAR','cleaning_3034a53c','ทำความสะอาด Cleaning',NULL,'SELECT',NULL,NULL,NULL,'["Done","Not Done"]',TRUE,TRUE,5,'atf-local-bb1d6bdd1235e32713ff7336'),
('rtb','BAR','comment_aa8e538e','ข้อคิดเห็น Comment',NULL,'TEXT',NULL,'ข้อแนะนำเพิ่มเติม',NULL,NULL,FALSE,TRUE,6,'atf-local-f7c7843f36414477c3c6d688'),
('rtb','CAB','visual_check_7b9fbc2b','ตรวจทั่วไป Visual Check',NULL,'SELECT',NULL,NULL,NULL,'["OK","Not OK"]',TRUE,TRUE,0,'atf-local-df0bdf3fde836b3dd6da2c88'),
('rtb','CAB','cleaning_ec090692','ทำความสะอาด Cleaning',NULL,'SELECT',NULL,NULL,NULL,'["Done","Not Done"]',TRUE,TRUE,1,'atf-local-3f538dbf6819366bdf82ecbe'),
('rtb','CAB','temperature_c63ea8ac','อุณหภูมิเบรคเกอร์ Breaker Temperature',NULL,'NUMBER','°c','0-85°c',NULL,NULL,TRUE,TRUE,2,'atf-local-9ad0655e61f8743b8b82f14a'),
('rtb','CAB','fan_4d8b204f','พัดลมระบายอากาศ Fan',NULL,'SELECT',NULL,NULL,NULL,'["Working","Not Working"]',TRUE,TRUE,3,'atf-local-54a7244ec61f2f0d775552d2'),
('rtb','CAB','comment_d464208b','ข้อคิดเห็น Comment',NULL,'TEXT',NULL,'ข้อแนะนำเพิ่มเติม',NULL,NULL,FALSE,TRUE,4,'atf-local-3142219a6fb387878f253f5e'),
('rtb','CTV','visual_check_e59e5732','ตรวจทั่วไป Visual Check',NULL,'SELECT',NULL,NULL,NULL,'["OK","Not OK"]',TRUE,TRUE,0,'atf-local-34fcf341917d3154005128d1'),
('rtb','CTV','cleaning_3d738bb5','ทำความสะอาด Cleaning',NULL,'SELECT',NULL,NULL,NULL,'["Done","Not Done"]',TRUE,TRUE,1,'atf-local-72cffc1f464ddef7d4ef6dd7'),
('rtb','CTV','leakage_72c69c66','การรั่ว Leakage',NULL,'SELECT',NULL,NULL,NULL,'["รั่ว","ไม่รั่ว"]',TRUE,TRUE,2,'atf-local-522cbfde635d21892836070a'),
('rtb','CTV','noise_ac9eb48b','เสียง Noise',NULL,'SELECT',NULL,NULL,NULL,'["Normal","Abnormal"]',TRUE,TRUE,3,'atf-local-e32c1ddeb2639101d6c02c6a'),
('rtb','CTV','vibration_c2ff5513','การสั่น Vibration',NULL,'SELECT',NULL,NULL,NULL,'["Normal","Abnormal"]',TRUE,TRUE,4,'atf-local-dadd268352c8338274731beb'),
('rtb','CTV','comment_7c5122e6','ข้อคิดเห็น Comment',NULL,'TEXT',NULL,NULL,NULL,NULL,FALSE,TRUE,5,'atf-local-0bce2276f4b382fb35bcd297'),
('rtb','FAN','visual_check_e52a77ce','ตรวจทั่วไป Visual Check',NULL,'SELECT',NULL,NULL,NULL,'["OK","Not OK"]',TRUE,TRUE,0,'atf-local-8c36f9452d3590a49cb378fe'),
('rtb','FAN','cleaning_ea0219e5','ทำความสะอาด Cleaning',NULL,'SELECT',NULL,NULL,NULL,'["Done","Not Done"]',TRUE,TRUE,1,'atf-local-3bd779bc61995e63660c2d66'),
('rtb','FAN','noise_75ac1f76','เสียง Noise',NULL,'SELECT',NULL,NULL,NULL,'["Normal","Abnormal"]',TRUE,TRUE,2,'atf-local-d8297c67053cc8eb668adcaf'),
('rtb','FAN','temperature_401d7725','อุณหภูมิ Temperature',NULL,'NUMBER','°c','0-85°c',NULL,NULL,TRUE,TRUE,6,'atf-local-73e799124e299bb2c88a5799'),
('rtb','FAN','comment_911c13dd','ข้อคิดเห็น Comment',NULL,'TEXT',NULL,NULL,NULL,NULL,FALSE,TRUE,7,'atf-local-506d5d7553f1784e04432141'),
('rtb','FIL','field_a6361ade','เปลี่ยนล่าสุด',NULL,'DATE',NULL,NULL,NULL,NULL,TRUE,TRUE,0,'atf-local-c46754bfaa5bea881147307d'),
('rtb','GEA','visual_check_652593cd','ตรวจทั่วไป Visual Check',NULL,'SELECT',NULL,NULL,NULL,'["OK","Not OK"]',TRUE,TRUE,0,'atf-local-553713dd3d302573774a9357'),
('rtb','GEA','cleaning_b9d95f6b','ทำความสะอาด Cleaning',NULL,'SELECT',NULL,NULL,NULL,'["Done","Not Done"]',TRUE,TRUE,1,'atf-local-09ccbdaff09f3a70d971268e'),
('rtb','GEA','noise_4066f9bc','เสียง Noise',NULL,'SELECT',NULL,NULL,NULL,'["Normal","Abnomal"]',TRUE,TRUE,2,'atf-local-d5f2001ec252a1e90d6e2815'),
('rtb','GEA','temperature_89892a5a','อุณหภูมิ Temperature',NULL,'NUMBER','°c','0-85°c',NULL,NULL,TRUE,TRUE,3,'atf-local-1ab963ddc31d74ef0551db7d'),
('rtb','GEA','comment_2ce393ef','ข้อคิดเห็น Comment',NULL,'TEXT',NULL,NULL,NULL,NULL,FALSE,TRUE,4,'atf-local-de90f318967ef4f529b8cf56'),
('rtb','GEA','gear_oil_14a13ae6','น้ำมันเกียร์ Gear Oil',NULL,'SELECT',NULL,NULL,NULL,'["เกณฑ์ปกติ","ต่ํากว่าเกณฑ์"]',TRUE,TRUE,5,'atf-local-0f69eda505aebea3cad4ce99'),
('rtb','GEA','greasing_36d5804f','อัดจาระบี  Greasing',NULL,'SELECT',NULL,NULL,NULL,'["อัด","ไม่อัด"]',TRUE,TRUE,6,'atf-local-faf8e5aa3c734670dce12cb4'),
('rtb','HTR','heater_984a7d3c','การทำงานของ Heater',NULL,'SELECT',NULL,NULL,NULL,'["ทำงาน","ไม่ทำงาน"]',TRUE,TRUE,0,'atf-local-18a2be51af12c26fd8aa21ad'),
('rtb','HTR','comment_8e82d759','ข้อคิดเห็น Comment',NULL,'TEXT',NULL,NULL,NULL,NULL,FALSE,TRUE,1,'atf-local-e541371e144c8793ed61ab13'),
('rtb','IMP','visual_check_2f6aa70b','ตรวจทั่วไป Visual Check',NULL,'SELECT',NULL,NULL,NULL,'["Normal","Abnormal"]',TRUE,TRUE,0,'atf-local-cb3311471de9cda0d9a48966'),
('rtb','IMP','cleaning_796d4886','ทำความสะอาด Cleaning',NULL,'SELECT',NULL,NULL,NULL,'["Done","Not Done"]',TRUE,TRUE,1,'atf-local-98e0c6bff1ce9ca25c2f83d4'),
('rtb','IMP','noise_d7d7ecb1','เสียง Noise',NULL,'SELECT',NULL,NULL,NULL,'["Normal","Abnormal"]',TRUE,TRUE,2,'atf-local-8734e36b166a45759e3525a5'),
('rtb','IMP','vibration_x_f2ab6145','การสั่น Vibration X',NULL,'NUMBER','m/s²','0-4 m/s²',NULL,NULL,TRUE,TRUE,3,'atf-local-32f8d9477dd80f2bc038304d'),
('rtb','IMP','vibration_y_ead8cb1e','การสั่น Vibration Y',NULL,'NUMBER','m/s²','0-4 m/s²',NULL,NULL,TRUE,TRUE,4,'atf-local-7795b844cb81458005db3a1f'),
('rtb','IMP','vibration_z_c0ef9b52','การสั่น Vibration Z',NULL,'NUMBER','m/s²','0-4 m/s²',NULL,NULL,TRUE,TRUE,5,'atf-local-d623ec20fe46642916e52a2f'),
('rtb','IMP','temperature_c5b2b0dc','อุณหภูมิ Temperature',NULL,'NUMBER','°c','0-85°c',NULL,NULL,TRUE,TRUE,6,'atf-local-7ebaac7ce6a4f84828eea01b'),
('rtb','IMP','comment_51c5bd64','ข้อคิดเห็น Comment',NULL,'TEXT',NULL,NULL,NULL,NULL,FALSE,TRUE,7,'atf-local-fd5bc80d46224917d474ecd8'),
('rtb','INS','visual_check_02fb21ab','ตรวจทั่วไป Visual Check',NULL,'SELECT',NULL,NULL,NULL,'["OK","Not OK"]',TRUE,TRUE,0,'atf-local-689d85600a31e43b19cc8d46'),
('rtb','INS','cleaning_764b6c8e','ทำความสะอาด Cleaning',NULL,'SELECT',NULL,NULL,NULL,'["Done","Not Done"]',TRUE,TRUE,1,'atf-local-bb29a990bd64147300418350'),
('rtb','INS','operation_8ed89cdc','การทำงาน Operation',NULL,'SELECT',NULL,NULL,NULL,'["Working","Not Working"]',TRUE,TRUE,2,'atf-local-3356bb6717f18c239d3d5d2e'),
('rtb','INS','comment_55574ee7','ข้อคิดเห็น Comment',NULL,'TEXT',NULL,'ข้อแนะนำเพิ่มเติม',NULL,NULL,FALSE,TRUE,3,'atf-local-a44303c080e9d57e2151f531'),
('rtb','MAC','visual_check_73ac0b27','ตรวจทั่วไป Visual Check',NULL,'SELECT',NULL,NULL,NULL,'["OK","Not OK"]',TRUE,TRUE,0,'atf-local-08e32bcc549bed0f50854e67'),
('rtb','MAC','cleaning_c668566d','ทำความสะอาด Cleaning',NULL,'SELECT',NULL,NULL,NULL,'["Done","Not Done"]',TRUE,TRUE,1,'atf-local-358657d83085618e76666a6d'),
('rtb','MAC','noise_d9a71c3d','เสียง Noise',NULL,'SELECT',NULL,NULL,NULL,'["Normal","Abnormal"]',TRUE,TRUE,2,'atf-local-c9aa8f655fd2a0cf03f3549d'),
('rtb','MAC','vibration_00f3ccc6','การสั่น Vibration',NULL,'SELECT',NULL,NULL,NULL,'["Normal","Abnormal"]',TRUE,TRUE,3,'atf-local-42b3c9c2fb6d34c92c3bd204'),
('rtb','MAC','temperature_c174430e','อุณหภูมิ Temperature',NULL,'NUMBER','°c','0-85°c',NULL,NULL,TRUE,TRUE,4,'atf-local-626a4bcbce1165dbb4f498a8'),
('rtb','MAC','leakage_139ee2af','การรั่ว Leakage',NULL,'SELECT',NULL,NULL,NULL,'["รั่ว","ไม่รั่ว"]',TRUE,TRUE,5,'atf-local-c826aac8b4b7a8ae8f88d43e'),
('rtb','MAC','comment_3799682f','ข้อคิดเห็น Comment',NULL,'TEXT',NULL,'ข้อแนะนำเพิ่มเติม',NULL,NULL,FALSE,TRUE,6,'atf-local-f0fe2256e13fa21f3278916b'),
('rtb','MOT','visual_check_672ed73d','ตรวจทั่วไป Visual Check',NULL,'SELECT',NULL,NULL,NULL,'["OK","Not OK"]',TRUE,TRUE,0,'atf-local-09b5b6677b31852928159bab'),
('rtb','MOT','cleaning_69dc683f','ทำความสะอาด Cleaning',NULL,'SELECT',NULL,NULL,NULL,'["Done","Not Done"]',TRUE,TRUE,1,'atf-local-369bae11e9a8468b40fa442c'),
('rtb','MOT','noise_f1e76885','เสียง Noise',NULL,'SELECT',NULL,NULL,NULL,'["Normal","Abnormal"]',TRUE,TRUE,2,'atf-local-62c687e86dee12ee0c5e418b'),
('rtb','MOT','vibration_dd83dc58','การสั่น Vibration',NULL,'SELECT',NULL,NULL,NULL,'["Normal","Abnormal"]',TRUE,TRUE,3,'atf-local-4f34ce16b3e1f3747a1bc32c'),
('rtb','MOT','temperature_37c2eaa5','อุณหภูมิ Temperature',NULL,'NUMBER','°c','0-85°c',NULL,NULL,TRUE,TRUE,4,'atf-local-4d26dfdf34264a14f8985843'),
('rtb','MOT','operation_5f227f46','การทำงาน Operation',NULL,'SELECT',NULL,NULL,NULL,'["Working","Not Working"]',TRUE,TRUE,5,'atf-local-c13d01f16f482fcae2d92ed6'),
('rtb','MOT','comment_57a336dd','ข้อคิดเห็น Comment',NULL,'TEXT',NULL,'ข้อแนะนำเพิ่มเติม',NULL,NULL,FALSE,TRUE,6,'atf-local-204dc7f50d519b9dc24579e0'),
('rtb','MOT','field_a204f8ef','กระแสไฟฟ้า',NULL,'NUMBER','Amp',NULL,NULL,NULL,TRUE,TRUE,7,'atf-local-d8b794ad960b5ec18d349c98'),
('rtb','MOT','volt_14cd44e6','Volt แรงดันไฟฟ้า',NULL,'NUMBER','Volt','230-400 VAC',NULL,NULL,TRUE,TRUE,8,'atf-local-d860c8ac52abd1da090e85cb'),
('rtb','OCL','visual_check_8b6020e5','ตรวจทั่วไป Visual Check',NULL,'SELECT',NULL,NULL,NULL,'["OK","Not OK"]',TRUE,TRUE,0,'atf-local-8510d206f52aa34585688be4'),
('rtb','OCL','cleaning_9c466010','ทำความสะอาด Cleaning',NULL,'SELECT',NULL,NULL,NULL,'["Done","Not Done"]',TRUE,TRUE,1,'atf-local-1679562a36734ef1b440f0fc'),
('rtb','OCL','leakage_612b3739','การรั่ว Leakage',NULL,'SELECT',NULL,NULL,NULL,'["รั่ว","ไม่รั่ว"]',TRUE,TRUE,2,'atf-local-93cc1ace5e0be857140e1266'),
('rtb','OCL','inlet_temperature_49e63b21','อุณหภูมิขาเข้า Inlet Temperature',NULL,'NUMBER','°c',NULL,NULL,NULL,TRUE,TRUE,3,'atf-local-b25065059e014fcccaa2fe01'),
('rtb','OCL','outlet_temperature_77643b41','อุณหภูมิขาออก Outlet Temperature',NULL,'NUMBER','°c',NULL,NULL,NULL,TRUE,TRUE,4,'atf-local-abdcbe66a8ba7ab5d9150bbc'),
('rtb','OCL','comment_85c589a5','ข้อคิดเห็น Comment',NULL,'TEXT',NULL,'ข้อแนะนำเพิ่มเติม',NULL,NULL,FALSE,TRUE,5,'atf-local-bb4f36805f4891e66fab165e'),
('rtb','PRX','visual_check_6c47796d','ตรวจทั่วไป Visual Check',NULL,'SELECT',NULL,NULL,NULL,'["OK","Not OK"]',TRUE,TRUE,0,'atf-local-9e1d410ef5f58940ac44a27b'),
('rtb','PRX','cleaning_a487e59b','ทำความสะอาด Cleaning',NULL,'SELECT',NULL,NULL,NULL,'["Done","Not Done"]',TRUE,TRUE,1,'atf-local-07444567838989d3a998556f'),
('rtb','PRX','operation_3ab2b7b8','การทำงาน Operation',NULL,'SELECT',NULL,NULL,NULL,'["Working","Not Working"]',TRUE,TRUE,3,'atf-local-10e1d0d79d4051dfe55205ec'),
('rtb','PRX','comment_c542b589','ข้อคิดเห็น Comment',NULL,'TEXT',NULL,'ข้อแนะนำเพิ่มเติม',NULL,NULL,FALSE,TRUE,4,'atf-local-fb764f7d81c9d69379f0bc32'),
('rtb','PUM','visual_check_30066c39','ตรวจทั่วไป Visual Check',NULL,'SELECT',NULL,NULL,NULL,'["OK","Not OK"]',TRUE,TRUE,0,'atf-local-78b38098b6ddbc66dec99639'),
('rtb','PUM','cleaning_e2f2b0d6','ทำความสะอาด Cleaning',NULL,'SELECT',NULL,NULL,NULL,'["Done","Not Done"]',TRUE,TRUE,1,'atf-local-8294acb7571cdad56e973908'),
('rtb','PUM','leakage_210b8ad1','การรั่ว Leakage',NULL,'SELECT',NULL,NULL,NULL,'["รั่ว","ไม่รั่ว"]',TRUE,TRUE,2,'atf-local-ba38054c8afda4749c58a3ae'),
('rtb','PUM','noise_29ac2b71','เสียง Noise',NULL,'SELECT',NULL,NULL,NULL,'["Normal","Abnormal"]',TRUE,TRUE,3,'atf-local-58592f226885889f3777cb40'),
('rtb','PUM','vibration_4966b2b4','การสั่น Vibration',NULL,'SELECT',NULL,NULL,NULL,'["Normal","Abnormal"]',TRUE,TRUE,4,'atf-local-3679ace493a2b98e67367f7b'),
('rtb','PUM','temperature_262534eb','อุณหภูมิ Temperature',NULL,'NUMBER','°c','0-85°c',NULL,NULL,TRUE,TRUE,5,'atf-local-ea8b29a9ef12b945891891e3'),
('rtb','PUM','comment_b712b2ed','ข้อคิดเห็น Comment',NULL,'TEXT',NULL,'ข้อแนะนำเพิ่มเติม',NULL,NULL,FALSE,TRUE,6,'atf-local-89f2e4754cea4218023092eb'),
('rtb','SEA','visual_check_2f641316','ตรวจทั่วไป Visual Check',NULL,'SELECT',NULL,NULL,NULL,'["OK","Not OK"]',TRUE,TRUE,0,'atf-local-80ed8bc170512d3fdc7ed5a8'),
('rtb','SEA','cleaning_45c901fa','ทำความสะอาด Cleaning',NULL,'SELECT',NULL,NULL,NULL,'["Done","Not Done"]',TRUE,TRUE,1,'atf-local-06d1e101109fa58e4a8885ef'),
('rtb','SEA','leakage_07854125','การรั่ว Leakage',NULL,'SELECT',NULL,NULL,NULL,'["รั่ว","ไม่รั่ว"]',TRUE,TRUE,2,'atf-local-76ddab8540ffaaee5c9092a9'),
('rtb','SEA','temperature_b4acde76','อุณหภูมิ Temperature',NULL,'NUMBER','°c','0-85°c',NULL,NULL,TRUE,TRUE,3,'atf-local-b54a3d4859bf2f608b9f3807'),
('rtb','SEA','comment_4f8397b4','ข้อคิดเห็น Comment',NULL,'TEXT',NULL,'ข้อแนะนำเพิ่มเติม',NULL,NULL,FALSE,TRUE,4,'atf-local-4bbedd36e634468cd07244db'),
('rtb','SLV','visual_check_f529f808','ตรวจทั่วไป Visual Check',NULL,'SELECT',NULL,NULL,NULL,'["OK","Not OK"]',TRUE,TRUE,0,'atf-local-76c1415c64ea3be559ff76c9'),
('rtb','SLV','cleaning_3dde149d','ทำความสะอาด Cleaning',NULL,'SELECT',NULL,NULL,NULL,'["Done","Not Done"]',TRUE,TRUE,1,'atf-local-be9b4cc1e9d684995d8411a8'),
('rtb','SLV','operation_5e942430','การทำงาน Operation',NULL,'SELECT',NULL,NULL,NULL,'["Working","Not Working"]',TRUE,TRUE,2,'atf-local-4b202b7bc386cab7356b1d9d'),
('rtb','SLV','leakage_b8c6d854','การรั่ว Leakage',NULL,'SELECT',NULL,NULL,NULL,'["รั่ว","ไม่รั่ว"]',TRUE,TRUE,3,'atf-local-641a764bc34e85653ed0dff7'),
('rtb','SLV','coil_temperature_9f0e8001','อุณหภูมิคอยล์ Coil Temperature',NULL,'NUMBER','°c','0-85°c',NULL,NULL,TRUE,TRUE,4,'atf-local-5fca1c1aedb3a7714afe8b7b'),
('rtb','SLV','comment_2d63ec7a','ข้อคิดเห็น Comment',NULL,'TEXT',NULL,'ข้อแนะนำเพิ่มเติม',NULL,NULL,FALSE,TRUE,5,'atf-local-30ccaae6c7bddc1eca2ad290'),
('rtb','SWP','visual_check_b9c696e9','ตรวจทั่วไป Visual Check',NULL,'SELECT',NULL,NULL,NULL,'["OK","Not OK"]',TRUE,TRUE,0,'atf-local-fe5dab3301ca0971acb88f29'),
('rtb','SWP','cleaning_9a3abdfd','ทำความสะอาด Cleaning',NULL,'SELECT',NULL,NULL,NULL,'["Done","Not Done"]',TRUE,TRUE,1,'atf-local-e248a6bbcc876968a67c4de7'),
('rtb','SWP','operation_89f56071','การทำงาน Operation',NULL,'SELECT',NULL,NULL,NULL,'["Working","Not Working"]',TRUE,TRUE,2,'atf-local-bdbbf6dc1dc3aec674c5625c'),
('rtb','SWP','comment_7d9cfc39','ข้อคิดเห็น Comment',NULL,'TEXT',NULL,'ข้อแนะนำเพิ่มเติม',NULL,NULL,FALSE,TRUE,4,'atf-local-a01e9e0061699c9b872dd55c'),
('rtb','TNK','visual_check_5289c0e6','ตรวจทั่วไป Visual Check',NULL,'SELECT',NULL,NULL,NULL,'["OK","Not OK"]',TRUE,TRUE,0,'atf-local-0c15e50b58053b20c25113d0'),
('rtb','TNK','cleaning_38a86b71','ทำความสะอาด Cleaning',NULL,'SELECT',NULL,NULL,NULL,'["Done","Not Done"]',TRUE,TRUE,1,'atf-local-63b8fc918bcaa4800b3f2cb0'),
('rtb','TNK','leakage_9cff98f8','การรั่ว Leakage',NULL,'SELECT',NULL,NULL,NULL,'["รั่ว","ไม่รั่ว"]',TRUE,TRUE,2,'atf-local-2bca641b0cfc59f05b1d3c6f'),
('rtb','TNK','level_23848f2f','ระดับ Level',NULL,'NUMBER','%','กรอกระดับที่ตรวจวัดได้',NULL,NULL,TRUE,TRUE,3,'atf-local-7270b6d99de3e0eb0a4f9e8c'),
('rtb','TNK','comment_5bab4cf8','ข้อคิดเห็น Comment',NULL,'TEXT',NULL,'ข้อแนะนำเพิ่มเติม',NULL,NULL,FALSE,TRUE,4,'atf-local-8f6e9bff80c0080d2b42673f'),
('rtb','TRF','visual_check_442af83d','ตรวจทั่วไป Visual Check',NULL,'SELECT',NULL,NULL,NULL,'["OK","Not OK"]',TRUE,TRUE,0,'atf-local-fbbfdca13cfa7cd2e3fc4398'),
('rtb','TRF','cleaning_f6ca089e','ทำความสะอาด Cleaning',NULL,'SELECT',NULL,NULL,NULL,'["Done","Not Done"]',TRUE,TRUE,1,'atf-local-1dcad8aa0092659098ff5633'),
('rtb','TRF','temperature_24cb2495','อุณหภูมิ Temperature',NULL,'NUMBER','°c','0-85°c',NULL,NULL,TRUE,TRUE,2,'atf-local-d641ed9a20adf7583806d707'),
('rtb','TRF','oil_level_26979d0c','ระดับน้ำมัน Oil Level',NULL,'SELECT',NULL,NULL,NULL,'["Normal","Low"]',TRUE,TRUE,3,'atf-local-e4e690d3bd4ca29a708a98b2'),
('rtb','TRF','noise_f65211d2','เสียง Noise',NULL,'SELECT',NULL,NULL,NULL,'["Normal","Abnormal"]',TRUE,TRUE,4,'atf-local-4b4f371987550b486e071cdc'),
('rtb','TRF','leakage_e7aefd02','การรั่ว Leakage',NULL,'SELECT',NULL,NULL,NULL,'["รั่ว","ไม่รั่ว"]',TRUE,TRUE,5,'atf-local-11cf5e61ebbe4e7e1d8bd32c'),
('rtb','TRF','comment_aeea80a7','ข้อคิดเห็น Comment',NULL,'TEXT',NULL,'ข้อแนะนำเพิ่มเติม',NULL,NULL,FALSE,TRUE,6,'atf-local-629447d84e6998061613bdaf'),
('rtb','TUB','visual_check_d4267380','ตรวจทั่วไป Visual Check',NULL,'SELECT',NULL,NULL,NULL,'["OK","Not OK"]',TRUE,TRUE,0,'atf-local-57fd35c206ca9e3e9c8086cd'),
('rtb','TUB','cleaning_eed19e9a','ทำความสะอาด Cleaning',NULL,'SELECT',NULL,NULL,NULL,'["Done","Not Done"]',TRUE,TRUE,1,'atf-local-2bc60aca5032fd173325f92f'),
('rtb','TUB','leakage_ed129a6a','การรั่ว Leakage',NULL,'SELECT',NULL,NULL,NULL,'["รั่ว","ไม่รั่ว"]',TRUE,TRUE,2,'atf-local-11fcc75d23a516edd0ed4ba8'),
('rtb','TUB','corrosion_650a190d','การกัดกร่อน Corrosion',NULL,'SELECT',NULL,NULL,NULL,'["ไม่พบ","พบ"]',TRUE,TRUE,3,'atf-local-6ca3419fd7b22680d83309c5'),
('rtb','TUB','comment_64db36ba','ข้อคิดเห็น Comment',NULL,'TEXT',NULL,'ข้อแนะนำเพิ่มเติม',NULL,NULL,FALSE,TRUE,4,'atf-local-8da2bff398c2df2f140b6667'),
('rtb','VEH','visual_check_78e13a5c','ตรวจทั่วไป Visual Check',NULL,'SELECT',NULL,NULL,NULL,'["OK","Not OK"]',TRUE,TRUE,0,'atf-local-4266499a467643f45f785245'),
('rtb','VEH','cleaning_3dcd8cee','ทำความสะอาด Cleaning',NULL,'SELECT',NULL,NULL,NULL,'["Done","Not Done"]',TRUE,TRUE,1,'atf-local-65b795e662b7462c111c2a6d'),
('rtb','VEH','operation_532d5b8f','การทำงาน Operation',NULL,'SELECT',NULL,NULL,NULL,'["Working","Not Working"]',TRUE,TRUE,2,'atf-local-deb4f7290b6a0645c5298288'),
('rtb','VEH','leakage_2fb80c13','การรั่ว Leakage',NULL,'SELECT',NULL,NULL,NULL,'["รั่ว","ไม่รั่ว"]',TRUE,TRUE,3,'atf-local-b8baa52ef281dda7240e6b60'),
('rtb','VEH','tire_condition_9ba0648a','สภาพยาง Tire Condition',NULL,'SELECT',NULL,NULL,NULL,'["Normal","Abnormal"]',TRUE,TRUE,4,'atf-local-f7ac2e78e52320957514fb2f'),
('rtb','VEH','comment_7f1ef7ad','ข้อคิดเห็น Comment',NULL,'TEXT',NULL,'ข้อแนะนำเพิ่มเติม',NULL,NULL,FALSE,TRUE,5,'atf-local-1345b8f4733b197c9c44ffcd');

DO $$
DECLARE missing_types TEXT;
BEGIN
  IF (SELECT COUNT(*) FROM "_technical_field_source") <> 116 THEN
    RAISE EXCEPTION 'Technical Field source count must be 116';
  END IF;

  SELECT string_agg(m."typeCode", ', ' ORDER BY m."typeCode") INTO missing_types
  FROM (
    SELECT DISTINCT s."typeCode"
    FROM "_technical_field_source" s
    LEFT JOIN "AssetType" t
      ON t."plantId"='primary-plant' AND t."code"=s."typeCode"
    WHERE t."id" IS NULL
  ) m;
  IF missing_types IS NOT NULL THEN
    RAISE EXCEPTION 'Production Asset Types are missing for Local templates: %', missing_types;
  END IF;
END $$;

CREATE SCHEMA technical_field_sync_backup_20261006;
CREATE TABLE technical_field_sync_backup_20261006."AssetTechnicalField" AS
SELECT f.*
FROM public."AssetTechnicalField" f
JOIN public."AssetType" t ON t."id"=f."assetTypeId"
WHERE t."plantId"='primary-plant';
CREATE TABLE technical_field_sync_backup_20261006."AssetTechnicalValue" AS
SELECT v.*
FROM public."AssetTechnicalValue" v
JOIN public."AssetTechnicalField" f ON f."id"=v."fieldId"
JOIN public."AssetType" t ON t."id"=f."assetTypeId"
WHERE t."plantId"='primary-plant';

INSERT INTO "AssetTechnicalField" (
  "id", "assetTypeId", "key", "labelTh", "labelEn", "dataType", "unit",
  "helpText", "indicatorText", "optionsJson", "required", "active", "sortOrder",
  "createdAt", "updatedAt"
)
SELECT
  s."newId", t."id", s."key", s."labelTh", s."labelEn", s."dataType", s."unit",
  s."helpText", s."indicatorText", s."optionsJson", s."required", s."active", s."sortOrder",
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "_technical_field_source" s
JOIN "AssetType" t
  ON t."plantId"='primary-plant' AND t."code"=s."typeCode"
ON CONFLICT ("assetTypeId", "key") DO UPDATE SET
  "labelTh"=EXCLUDED."labelTh",
  "labelEn"=EXCLUDED."labelEn",
  "dataType"=EXCLUDED."dataType",
  "unit"=EXCLUDED."unit",
  "helpText"=EXCLUDED."helpText",
  "indicatorText"=EXCLUDED."indicatorText",
  "optionsJson"=EXCLUDED."optionsJson",
  "required"=EXCLUDED."required",
  "active"=EXCLUDED."active",
  "sortOrder"=EXCLUDED."sortOrder",
  "updatedAt"=CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM "_technical_field_source" s
    JOIN "AssetType" t ON t."plantId"='primary-plant' AND t."code"=s."typeCode"
    JOIN "AssetTechnicalField" f ON f."assetTypeId"=t."id" AND f."key"=s."key"
  ) <> 116 THEN
    RAISE EXCEPTION 'Technical Field post-sync count verification failed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "_technical_field_source" s
    JOIN "AssetType" t ON t."plantId"='primary-plant' AND t."code"=s."typeCode"
    JOIN "AssetTechnicalField" f ON f."assetTypeId"=t."id" AND f."key"=s."key"
    WHERE f."labelTh" IS DISTINCT FROM s."labelTh"
       OR f."labelEn" IS DISTINCT FROM s."labelEn"
       OR f."dataType" IS DISTINCT FROM s."dataType"
       OR f."unit" IS DISTINCT FROM s."unit"
       OR f."helpText" IS DISTINCT FROM s."helpText"
       OR f."indicatorText" IS DISTINCT FROM s."indicatorText"
       OR f."optionsJson" IS DISTINCT FROM s."optionsJson"
       OR f."required" IS DISTINCT FROM s."required"
       OR f."active" IS DISTINCT FROM s."active"
       OR f."sortOrder" IS DISTINCT FROM s."sortOrder"
  ) THEN
    RAISE EXCEPTION 'Technical Field post-sync content verification failed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM technical_field_sync_backup_20261006."AssetTechnicalField" old
    LEFT JOIN public."AssetTechnicalField" current ON current."id"=old."id"
    WHERE current."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'An existing Production Technical Field ID was removed';
  END IF;

  IF (SELECT COUNT(*) FROM technical_field_sync_backup_20261006."AssetTechnicalValue") <>
     (SELECT COUNT(*)
      FROM public."AssetTechnicalValue" v
      JOIN public."AssetTechnicalField" f ON f."id"=v."fieldId"
      JOIN public."AssetType" t ON t."id"=f."assetTypeId"
      WHERE t."plantId"='primary-plant') THEN
    RAISE EXCEPTION 'Technical Values changed during template sync';
  END IF;
END $$;

COMMIT;
