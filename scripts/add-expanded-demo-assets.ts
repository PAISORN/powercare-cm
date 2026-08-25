import { db } from "../lib/db";

type ChildSpec = { suffix: string; type: "PMP" | "MOT" | "FAN" | "GBX" | "VFD"; name: string; status?: string };
type SetSpec = { system: [string,string,string]; family: [string,string,string]; seq: number; name: string; zoneHint: string; criticality: string; children: ChildSpec[] };

const sets: SetSpec[] = [
  { system:["BLR","ระบบหม้อไอน้ำ","Boiler System"], family:["IDF","พัดลมดูดอากาศ","Induced Draft Fan"], seq:1, name:"ชุดพัดลมดูดอากาศ ID Fan หมายเลข 1", zoneHint:"boiler", criticality:"CRITICAL", children:[{suffix:"FAN",type:"FAN",name:"ใบพัด ID Fan"},{suffix:"MOT",type:"MOT",name:"มอเตอร์ ID Fan"},{suffix:"VFD",type:"VFD",name:"ชุดควบคุม VFD ID Fan"}] },
  { system:["BLR","ระบบหม้อไอน้ำ","Boiler System"], family:["PAF","พัดลมอากาศปฐมภูมิ","Primary Air Fan"], seq:1, name:"ชุด Primary Air Fan หมายเลข 1", zoneHint:"boiler", criticality:"HIGH", children:[{suffix:"FAN",type:"FAN",name:"ใบพัด Primary Air Fan"},{suffix:"MOT",type:"MOT",name:"มอเตอร์ Primary Air Fan",status:"UNDER_REPAIR"}] },
  { system:["CWS","ระบบน้ำหล่อเย็น","Cooling Water System"], family:["CWP","ปั๊มน้ำหล่อเย็น","Cooling Water Pump"], seq:1, name:"ชุดปั๊มน้ำหล่อเย็น หมายเลข 1", zoneHint:"cooling", criticality:"CRITICAL", children:[{suffix:"PMP",type:"PMP",name:"ปั๊มน้ำหล่อเย็น"},{suffix:"MOT",type:"MOT",name:"มอเตอร์ปั๊มน้ำหล่อเย็น"}] },
  { system:["CWS","ระบบน้ำหล่อเย็น","Cooling Water System"], family:["CTF","พัดลมหอหล่อเย็น","Cooling Tower Fan"], seq:1, name:"ชุดพัดลมหอหล่อเย็น หมายเลข 1", zoneHint:"cooling", criticality:"HIGH", children:[{suffix:"FAN",type:"FAN",name:"ใบพัด Cooling Tower"},{suffix:"GBX",type:"GBX",name:"เกียร์ทด Cooling Tower"},{suffix:"MOT",type:"MOT",name:"มอเตอร์ Cooling Tower"}] },
  { system:["TBN","ระบบกังหันไอน้ำ","Steam Turbine System"], family:["LOP","ปั๊มน้ำมันหล่อลื่น","Lube Oil Pump"], seq:1, name:"ชุดปั๊มน้ำมันหล่อลื่นกังหัน", zoneHint:"turbine", criticality:"CRITICAL", children:[{suffix:"PMP",type:"PMP",name:"ปั๊มน้ำมันหล่อลื่น"},{suffix:"MOT",type:"MOT",name:"มอเตอร์ปั๊มน้ำมันหล่อลื่น"}] },
  { system:["WTP","ระบบผลิตน้ำ","Water Treatment System"], family:["RWP","ปั๊มน้ำดิบ","Raw Water Pump"], seq:1, name:"ชุดปั๊มน้ำดิบ หมายเลข 1", zoneHint:"water", criticality:"MEDIUM", children:[{suffix:"PMP",type:"PMP",name:"ปั๊มน้ำดิบ"},{suffix:"MOT",type:"MOT",name:"มอเตอร์ปั๊มน้ำดิบ",status:"STANDBY"}] },
];

const typeDefs = {
  PMP:["ปั๊ม","Pump",[["flow","อัตราการไหล","Flow","m³/h"],["head","เฮด","Head","m"],["pressure","แรงดัน","Pressure","bar"]]],
  MOT:["มอเตอร์","Motor",[["power","กำลัง","Rated Power","kW"],["voltage","แรงดันไฟฟ้า","Voltage","V"],["current","กระแสไฟฟ้า","Current","A"],["rpm","ความเร็วรอบ","RPM","rpm"]]],
  FAN:["พัดลมอุตสาหกรรม","Industrial Fan",[["capacity","ปริมาณลม","Air Capacity","m³/h"],["pressure","แรงดันสถิต","Static Pressure","Pa"],["rpm","ความเร็วรอบ","RPM","rpm"]]],
  GBX:["เกียร์ทด","Gearbox",[["ratio","อัตราทด","Gear Ratio",""],["oil","ปริมาณน้ำมัน","Oil Capacity","L"]]],
  VFD:["อุปกรณ์ควบคุมความเร็ว","Variable Frequency Drive",[["power","กำลังพิกัด","Rated Power","kW"],["input","แรงดันขาเข้า","Input Voltage","V"],["output","แรงดันขาออก","Output Voltage","V"],["current","กระแสพิกัด","Rated Current","A"]]],
} as const;

async function main(){
  const plant=await db.plant.findFirstOrThrow({where:{active:true},include:{zones:true,organization:true}});
  const assetClass=await db.assetClass.upsert({where:{plantId_nameTh:{plantId:plant.id,nameTh:"เครื่องจักรหนัก"}},update:{active:true},create:{plantId:plant.id,nameTh:"เครื่องจักรหนัก",nameEn:"Heavy Machinery"}});
  const types:Record<string,{id:string}>= {};
  for(const [code,[nameTh,nameEn,fields]] of Object.entries(typeDefs)){
    const type=await db.assetType.upsert({where:{plantId_code:{plantId:plant.id,code}},update:{assetClassId:assetClass.id,nameTh,nameEn,active:true},create:{plantId:plant.id,assetClassId:assetClass.id,code,nameTh,nameEn}});types[code]=type;
    for(const [i,field] of fields.entries()){const [key,labelTh,labelEn,unit]=field;await db.assetTechnicalField.upsert({where:{assetTypeId_key:{assetTypeId:type.id,key}},update:{labelTh,labelEn,unit,active:true,sortOrder:i},create:{assetTypeId:type.id,key,labelTh,labelEn,unit:unit||null,dataType:"NUMBER",sortOrder:i}})}
  }
  const siteCode=plant.code.toUpperCase().replace(/[^A-Z0-9]/g,"");let assetCounter=0;const created:{id:string;code:string;nameTh:string;zoneId:string}[]=[];
  for(const set of sets){
    const [familyCode,familyTh,familyEn]=set.family;
    const family=await db.assetFamily.upsert({where:{plantId_code:{plantId:plant.id,code:familyCode}},update:{nameTh:familyTh,nameEn:familyEn,active:true},create:{plantId:plant.id,code:familyCode,nameTh:familyTh,nameEn:familyEn}});
    const zone=plant.zones.find(z=>z.name.toLowerCase().includes(set.zoneHint))??plant.zones[0];const seq=String(set.seq).padStart(3,"0");const parentCode=`${siteCode}-${familyCode}-${seq}`;
    const parent=await asset(parentCode,{plantId:plant.id,familyId:family.id,assetClassId:assetClass.id,zoneId:zone.id,sequence:set.seq,nameTh:set.name,nameEn:`${familyEn} Set ${set.seq}`,installationLocation:`${zone.name} · Equipment Bay ${set.seq}`,manufacturer:"PowerCare Demo Industries",model:`${familyCode}-SERIES-X`,serialNumber:`${familyCode}-SET-${seq}`,serialNormalized:`${familyCode}SET${seq}`,installedAt:new Date("2024-01-15T00:00:00+07:00"),commissionedAt:new Date("2024-02-01T00:00:00+07:00"),operatingStatus:"IN_SERVICE",criticality:set.criticality});created.push({...parent,zoneId:zone.id});assetCounter++;
    for(const [childIndex,child] of set.children.entries()){
      const childCode=`${siteCode}-${familyCode}-${child.suffix}-${seq}`;const type=types[child.type];const item=await asset(childCode,{plantId:plant.id,familyId:family.id,assetClassId:assetClass.id,assetTypeId:type.id,zoneId:zone.id,parentId:parent.id,sequence:set.seq,componentCode:child.suffix,nameTh:`${child.name} หมายเลข ${set.seq}`,nameEn:`${child.type} for ${familyEn} ${set.seq}`,installationLocation:`${zone.name} · ${familyCode} ${seq} · ${child.suffix}`,manufacturer:manufacturer(child.type),model:`${child.type}-${100+assetCounter}`,serialNumber:`${child.type}-${familyCode}-${seq}`,serialNormalized:`${child.type}${familyCode}${seq}`,installedAt:new Date("2024-01-20T00:00:00+07:00"),commissionedAt:new Date("2024-02-01T00:00:00+07:00"),operatingStatus:child.status??"IN_SERVICE",criticality:child.type==="MOT"||child.type==="PMP"?set.criticality:"HIGH"});created.push({...item,zoneId:zone.id});assetCounter++;await technical(item.id,type.id,child.type,childIndex);
    }
    await db.assetSequence.upsert({where:{plantId_familyId:{plantId:plant.id,familyId:family.id}},update:{lastNumber:{set:set.seq}},create:{plantId:plant.id,familyId:family.id,lastNumber:set.seq}});
  }
  const category=await db.category.findFirstOrThrow({where:{OR:[{plantId:plant.id},{plantId:null}],active:true}});
  for(const [index,item] of created.filter((_,i)=>i%2===1).slice(0,10).entries()){
    const closedAt=new Date(Date.now()-(index+1)*7*86400000);const number=`DEMO-CM-ASSET-${String(index+1).padStart(3,"0")}`;
    await db.cmWork.upsert({where:{number},update:{assetId:item.id,assetCodeSnapshot:item.code,assetNameSnapshot:item.nameTh,machineName:item.nameTh,closedAt,status:"CLOSED"},create:{number,submissionKey:`demo-asset-cm-${index+1}`,requesterName:"พนักงานฝ่ายผลิต (Demo)",requesterDepartment:"ฝ่ายผลิต",organizationId:plant.organizationId,plantId:plant.id,categoryId:category.id,zoneId:item.zoneId,machineName:item.nameTh,assetId:item.id,assetCodeSnapshot:item.code,assetNameSnapshot:item.nameTh,problemTitle:cmTitle(index),problemDetail:"ข้อมูลตัวอย่างสำหรับแสดงการเชื่อมโยง Asset กับประวัติงาน CM",urgency:index<3?"URGENT":"NORMAL",status:"CLOSED",rootCause:"การสึกหรอตามชั่วโมงการใช้งาน",correctiveAction:"ตรวจสอบ ปรับตั้ง และเปลี่ยนชิ้นส่วนที่สึกหรอ พร้อมทดสอบเดินเครื่อง",workNote:"ผลการทดสอบหลังซ่อมอยู่ในเกณฑ์ปกติ",waitingToCloseAt:new Date(closedAt.getTime()-86400000),closedAt}});
  }
  console.log(JSON.stringify({addedAssets:created.length,linkedClosedCm:10,codes:created.map(x=>x.code)},null,2));
}

async function asset(code:string,data:Record<string,unknown>){const item=await db.asset.upsert({where:{code},update:data,create:{publicToken:`${code.toLowerCase()}-expanded-demo`,code,...data} as never,select:{id:true,code:true,nameTh:true}});return {...item,code:item.code!}}
async function technical(assetId:string,typeId:string,type:string,offset:number){const values:Record<string,Record<string,string>>={PMP:{flow:String(160+offset*15),head:String(95+offset*8),pressure:String(9.5+offset)},MOT:{power:String(90+offset*30),voltage:"400",current:String(165+offset*35),rpm:"1485"},FAN:{capacity:String(45000+offset*5000),pressure:String(1850+offset*200),rpm:"985"},GBX:{ratio:"12.5",oil:"85"},VFD:{power:"160",input:"400",output:"400",current:"310"}};const fields=await db.assetTechnicalField.findMany({where:{assetTypeId:typeId}});for(const field of fields)await db.assetTechnicalValue.upsert({where:{assetId_fieldId:{assetId,fieldId:field.id}},update:{value:values[type]?.[field.key]??"-",unit:field.unit},create:{assetId,fieldId:field.id,dataType:field.dataType,unit:field.unit,value:values[type]?.[field.key]??"-",sortOrder:field.sortOrder}})}
function manufacturer(type:string){return({PMP:"KSB",MOT:"ABB",FAN:"Howden",GBX:"Flender",VFD:"Danfoss"} as Record<string,string>)[type]}
function cmTitle(index:number){return["ตรวจพบการสั่นสะเทือนสูง","แบริ่งมีเสียงผิดปกติ","ซีลมีการรั่วซึม","กระแสมอเตอร์สูงกว่าปกติ","อุณหภูมิเกียร์สูง","VFD แจ้งเตือน Overcurrent","ปรับแนวศูนย์เพลา","เปลี่ยนถ่ายน้ำมันหล่อลื่น","ตรวจสอบใบพัดและ Balance","เปลี่ยน Mechanical Seal"][index]}
main().finally(()=>db.$disconnect());
