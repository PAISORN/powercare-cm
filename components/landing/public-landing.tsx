import {
  ArrowRight,
  BarChart3,
  Boxes,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  Cloud,
  ClipboardCheck,
  Database,
  Factory,
  Gauge,
  Monitor,
  PackageCheck,
  Play,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { PublicAnnouncements } from "../public-announcements";
import { LandingNavigation } from "./landing-navigation";

type LandingAnnouncement = Parameters<typeof PublicAnnouncements>[0]["announcements"][number];

type PublicLandingProps = {
  announcements: LandingAnnouncement[];
  feedbackAction: (formData: FormData) => void | Promise<void>;
  feedbackStatus?: string;
};

const modules = [
  {
    id: "cm",
    eyebrow: "Available",
    title: "Corrective Maintenance",
    shortTitle: "CM",
    description: "รับแจ้งซ่อม จัดคิว มอบหมาย ติดตาม และปิดงานพร้อมเอกสารในกระบวนการเดียว",
    icon: Wrench,
    tone: "blue",
    available: true,
    screenshot: { src: "/landing/modules/cm-current.webp", caption: "CM Dashboard", alt: "หน้าจอ CM Dashboard ปัจจุบัน แสดงสถานะงานซ่อมและแนวโน้มรายเดือน" },
  },
  {
    id: "store",
    eyebrow: "Available",
    title: "Spare Parts & Store",
    shortTitle: "Store",
    description: "ควบคุมอะไหล่ ใบเบิก การอนุมัติ การรับเข้า และประวัติ Stock Movement ราย Site",
    icon: Boxes,
    tone: "teal",
    available: true,
    screenshot: { src: "/landing/modules/store-current.webp", caption: "Stock Inventory", alt: "หน้าจอ Stock ปัจจุบัน แสดงยอดคงเหลือและสถานะอะไหล่" },
  },
  {
    id: "pm",
    eyebrow: "Coming Soon",
    title: "Preventive Maintenance",
    shortTitle: "PM",
    description: "วางแผน PM ตามรอบเวลา สร้างงานล่วงหน้า และติดตามความครบถ้วนของแผน",
    icon: CalendarCheck2,
    tone: "amber",
    available: false,
    screenshot: { src: "/landing/modules/pm-current.webp", caption: "PM Calendar", alt: "หน้าจอ PM Calendar ปัจจุบัน แสดงปฏิทินแผนบำรุงรักษา" },
  },
  {
    id: "asset",
    eyebrow: "Coming Soon",
    title: "Asset Management",
    shortTitle: "Asset",
    description: "ศูนย์กลางทะเบียนเครื่องจักร ประวัติซ่อม เอกสาร และข้อมูลวงจรชีวิตทรัพย์สิน",
    icon: Factory,
    tone: "green",
    available: false,
    screenshot: { src: "/landing/modules/asset-current.webp", caption: "Assets Tree", alt: "หน้าจอ Assets Tree ปัจจุบัน แสดงโครงสร้างเครื่องจักรและอุปกรณ์" },
  },
] as const;

const overviewModules = [modules[2], modules[0], modules[1], modules[3]];

const faqs = [
  ["PowerCare รองรับหลายโรงงานหรือไม่", "รองรับโครงสร้าง Owner Admin → Organization → Site → User โดยแยกข้อมูลและสิทธิ์ตามขอบเขตที่ผู้ใช้รับผิดชอบ"],
  ["ผู้แจ้งซ่อมทั่วไปต้องมีบัญชีหรือไม่", "ไม่จำเป็น แต่ละ Site มี Public URL และ QR Code ของตัวเองสำหรับแจ้งซ่อมหรือเบิกอะไหล่โดยไม่ปะปนกับ Site อื่น"],
  ["CM และ Store ใช้งานร่วมกันอย่างไร", "ช่างสามารถสร้างคำขอเบิกอะไหล่อ้างอิงจากงาน CM ได้ และงานจะเดินหน้าตามลำดับอนุมัติของ Engineer และ Store Officer"],
  ["PM และ Asset เปิดใช้งานแล้วหรือยัง", "อยู่ระหว่างพัฒนาเพื่อใช้งานจริง ในหน้า Landing จะแสดงสถานะ Coming Soon อย่างชัดเจนจนกว่าจะพร้อมเปิดบริการ"],
];

export function PublicLanding({ announcements, feedbackAction, feedbackStatus }: PublicLandingProps) {
  return (
    <main className="landing-page min-h-screen">
      <LandingNavigation />
      <Hero />
      <ModuleOverview />
      <ModuleDetails />
      <WhyAndHow />
      <PlatformCapabilities />
      <Benefits />
      <Faq />
      <section className="landing-band" id="announcements">
        <LandingSectionPhoto scene="campus" />
        <div className="landing-container">
          <SectionHeading eyebrow="Platform updates" title="ประกาศจาก PowerCare" description="ข่าวสารการให้บริการและการอัปเดตจากผู้ดูแลระบบ PowerCare" />
          <PublicAnnouncements announcements={announcements} />
          {!announcements.length ? (
            <div className="landing-empty-state">
              <Sparkles size={22} />
              <span>ยังไม่มีประกาศใหม่ในขณะนี้</span>
            </div>
          ) : null}
        </div>
      </section>
      <Feedback action={feedbackAction} status={feedbackStatus} />
      <SoonCta />
      <LandingFooter />
    </main>
  );
}

function Hero() {
  return (
    <section className="landing-hero" data-reveal-ignore id="top">
      <div className="landing-hero-background" aria-hidden="true">
        <Image alt="" src="/landing/powercare-maintenance-hero.webp" fill sizes="(max-width: 1023px) 100vw, 70vw" priority />
      </div>
      <div className="landing-container landing-hero-inner relative z-10">
        <div className="landing-hero-content">
          <h1><span>Power</span><strong>Care</strong></h1>
          <p className="landing-hero-lead">บริหารงานซ่อมบำรุง<br />ง่าย ครบ จบในที่เดียว</p>
          <p className="landing-hero-copy">เชื่อมงานซ่อมบำรุง อะไหล่ บุคลากร และข้อมูลทุก Site ให้การทำงานอยู่บนระบบเดียวกัน ใช้งานง่าย ปลอดภัย และเชื่อถือได้</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="landing-primary-cta" href="/login">เริ่มใช้งาน PowerCare <ArrowRight size={18} /></Link>
            <a className="landing-secondary-cta" href="#modules"><Play size={17} fill="currentColor" /> ดูรายละเอียดระบบ</a>
          </div>
          <div className="landing-trust-row">
            <span><ShieldCheck size={18} /><b>ปลอดภัย</b><small>ข้อมูลแยกตามสิทธิ์</small></span>
            <span><Cloud size={18} /><b>ใช้งานได้ทุกที่</b><small>รองรับทุกอุปกรณ์</small></span>
            <span><Building2 size={18} /><b>รองรับหลายองค์กร</b><small>และหลาย Site</small></span>
          </div>
        </div>
        <div className="landing-hero-product" role="img" aria-label="ตัวอย่างหน้าจอ PowerCare CM บน Laptop และ Mobile">
          <Image alt="" className="landing-hero-laptop" src="/landing/modules/cm-laptop.png" width={2000} height={1414} sizes="(max-width: 1023px) 90vw, 52vw" priority />
          <Image alt="" className="landing-hero-phone" src="/landing/modules/cm-mobile.png" width={1414} height={2000} sizes="(max-width: 1023px) 22vw, 13vw" loading="eager" />
        </div>
      </div>
      <a className="landing-next-hint" href="#modules" aria-label="ดูโมดูล"><span /></a>
    </section>
  );
}

const landingSectionPhotos = {
  maintenance: "/landing/powercare-maintenance-hero.webp",
  campus: "/landing/powercare-industrial-campus.webp",
  store: "/landing/powercare-spare-parts-store.webp",
} as const;

function LandingSectionPhoto({ scene, reverse = false }: { scene: keyof typeof landingSectionPhotos; reverse?: boolean }) {
  return (
    <div className={`landing-section-photo${reverse ? " landing-section-photo-reverse" : ""}`} aria-hidden="true" data-reveal-ignore>
      <Image alt="" src={landingSectionPhotos[scene]} fill sizes="100vw" loading="lazy" />
    </div>
  );
}

function ModuleOverview() {
  return (
    <section className="landing-band" id="modules">
      <LandingSectionPhoto scene="campus" />
      <div className="landing-container">
        <SectionHeading eyebrow="One connected platform" title="ระบบ CMMS ที่ครอบคลุมทุกงานซ่อมบำรุง" description="เชื่อมข้อมูล บุคลากร อะไหล่ และทุก Site บนแพลตฟอร์มเดียว พร้อมขยายสู่ PM และ Asset อย่างเป็นระบบ" centered />
        <div className="landing-module-showcase">
          {overviewModules.map((module) => {
            const Icon = module.icon;
            return (
              <article className={`landing-module-card module-${module.tone} module-overview-${module.id}`} key={module.id}>
                <div className="landing-module-copy">
                  <div className="landing-module-heading">
                    <span className="landing-module-icon"><Icon size={21} /></span>
                    <div className="landing-module-titles">
                      <p className="landing-module-short-title">{module.shortTitle}</p>
                      <h3>{module.title}</h3>
                    </div>
                    <span className={module.available ? "landing-available" : "landing-soon"}>{module.eyebrow}</span>
                  </div>
                  <p className="landing-module-description">{module.description}</p>
                </div>
                <div className="landing-module-screen">
                  <div className="landing-module-screen-toolbar" aria-hidden="true"><span /><span /><span /><b>{module.screenshot.caption}</b></div>
                  <a className="landing-module-screen-link" href={module.screenshot.src} target="_blank" rel="noopener noreferrer" aria-label={`ดูภาพหน้าจอ ${module.shortTitle} ขนาดเต็ม (เปิดแท็บใหม่)`}>
                    <Image alt={module.screenshot.alt} src={module.screenshot.src} width={1073} height={730} sizes="(max-width: 1023px) 90vw, 44vw" className="landing-module-screenshot" />
                  </a>
                </div>
                <div className="landing-module-footer">
                  <span><Monitor size={16} aria-hidden="true" />ภาพจากระบบจริง</span>
                  <a className="landing-module-link" href={`#${module.id}-details`} aria-label={`ดูรายละเอียด ${module.title}`}>ดูรายละเอียด<ArrowRight size={17} aria-hidden="true" /></a>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ModuleDetails() {
  return (
    <>
      <ProductBand id="cm-details" module="CM" title="ติดตามงานซ่อมตั้งแต่แจ้งจนปิดงาน" description="ทำให้ทุกฝ่ายเห็นสถานะเดียวกัน ลดการตามงานจากหลายช่องทาง และเก็บหลักฐานการดำเนินงานไว้ครบถ้วน" icon={<Wrench size={24} />}>
        <CmPreview />
      </ProductBand>
      <ProductBand id="store-details" module="Store" title="รู้ยอดอะไหล่และเส้นทางการเบิกทุกครั้ง" description="ค้นหาอะไหล่ ขออนุมัติ จ่าย รับเข้า และตรวจสอบ Stock Movement ด้วยข้อมูลที่แยกตาม Site" icon={<Store size={24} />} reverse>
        <StorePreview />
      </ProductBand>
      <ProductBand id="pm-details" module="PM · Coming Soon" title="วางแผนบำรุงรักษาก่อนเกิดความเสียหาย" description="โมดูล PM จะช่วยจัดรอบงาน เตือนกำหนด และติดตามความครบถ้วนของแผนจากปฏิทินส่วนกลาง" icon={<CalendarCheck2 size={24} />}>
        <ConceptPreview type="pm" />
      </ProductBand>
      <ProductBand id="asset-details" module="Asset · Coming Soon" title="เห็นประวัติและบริบทของเครื่องจักรในจุดเดียว" description="โมดูล Asset จะเชื่อมทะเบียนเครื่องจักร เอกสาร งานซ่อม และต้นทุนเพื่อรองรับการตัดสินใจระยะยาว" icon={<Factory size={24} />} reverse>
        <ConceptPreview type="asset" />
      </ProductBand>
    </>
  );
}

function ProductBand({ id, module, title, description, icon, reverse = false, children }: { id: string; module: string; title: string; description: string; icon: ReactNode; reverse?: boolean; children: ReactNode }) {
  return (
    <section className="landing-product-band" id={id}>
      <LandingSectionPhoto scene={id === "store-details" ? "store" : id === "asset-details" ? "campus" : "maintenance"} reverse={reverse} />
      <div className={`landing-container grid items-center gap-12 lg:grid-cols-2 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
        <div>
          <p className="landing-kicker">{icon} {module}</p>
          <h2 className="landing-section-title mt-4">{title}</h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-[var(--muted)]">{description}</p>
          <ul className="mt-7 grid gap-3 text-sm font-semibold">
            <li><CheckCircle2 size={17} /> แยกข้อมูลตาม Organization และ Site</li>
            <li><CheckCircle2 size={17} /> ใช้งานได้ทั้ง Desktop, Tablet และ Mobile</li>
            <li><CheckCircle2 size={17} /> มีประวัติสำหรับตรวจสอบย้อนหลัง</li>
          </ul>
        </div>
        {children}
      </div>
    </section>
  );
}

function CmPreview() {
  const items = [["CM-2026-07-0142", "Boiler feed pump vibration", "กำลังดำเนินการ"], ["CM-2026-07-0138", "Lighting panel inspection", "รอตรวจรับ"], ["CM-2026-07-0129", "Cooling fan abnormal sound", "ปิดงานแล้ว"]];
  return (
    <div className="landing-product-preview" aria-label="ตัวอย่างหน้าจอ CM">
      <PreviewToolbar title="CM Work Overview" />
      <div className="grid grid-cols-3 gap-2 border-b border-[var(--line)] p-4">
        <PreviewStat label="Open" value="24" /><PreviewStat label="In Process" value="11" /><PreviewStat label="Closed" value="86" />
      </div>
      <div className="divide-y divide-[var(--line)] px-4">
        {items.map(([number, title, status], index) => (
          <div className="grid grid-cols-[1fr_auto] gap-3 py-4" key={number}>
            <div className="min-w-0"><b className="text-sm">{number}</b><p className="truncate text-xs text-[var(--muted)]">{title}</p></div>
            <span className={`preview-status status-${index}`}>{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StorePreview() {
  const rows = [["Bearing 6312 C3", "12", "เพียงพอ"], ["Flexible coupling", "8", "ใกล้ Min"], ["Fuse 10A", "0", "หมดสต็อก"]];
  return (
    <div className="landing-product-preview" aria-label="ตัวอย่างหน้าจอ Store">
      <PreviewToolbar title="Spare Parts Stock" />
      <div className="grid grid-cols-3 gap-2 border-b border-[var(--line)] p-4">
        <PreviewStat label="Items" value="1,240" /><PreviewStat label="Low stock" value="18" /><PreviewStat label="Requests" value="7" />
      </div>
      <div className="divide-y divide-[var(--line)] px-4">
        {rows.map(([name, count, status], index) => (
          <div className="grid grid-cols-[1fr_50px_80px] items-center gap-2 py-4 text-sm" key={name}>
            <b className="truncate">{name}</b><span className="text-center font-extrabold">{count}</span><span className={`preview-status status-${index}`}>{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConceptPreview({ type }: { type: "pm" | "asset" }) {
  return (
    <div className="landing-concept-preview">
      <span className="landing-soon">Coming Soon</span>
      {type === "pm" ? <CalendarCheck2 size={58} /> : <Factory size={58} />}
      <h3>{type === "pm" ? "Maintenance Schedule" : "Asset Lifecycle"}</h3>
      <div className="concept-lines"><span /><span /><span /></div>
      <p>Concept preview · รายละเอียดอาจเปลี่ยนแปลงก่อนเปิดใช้งานจริง</p>
    </div>
  );
}

function PreviewToolbar({ title }: { title: string }) {
  return <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3"><b>{title}</b><span className="flex gap-1"><i /><i /><i /></span></div>;
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-[var(--soft)] p-3"><span className="block text-[11px] text-[var(--muted)]">{label}</span><b className="mt-1 block text-lg">{value}</b></div>;
}

function WhyAndHow() {
  const steps = [["01", "รับข้อมูลจากหน้างาน"], ["02", "ส่งต่อผู้รับผิดชอบ"], ["03", "ดำเนินงานและอนุมัติ"], ["04", "สรุปผลและตรวจสอบย้อนหลัง"]];
  return (
    <section className="landing-band landing-band-contrast">
      <LandingSectionPhoto scene="maintenance" />
      <div className="landing-container grid gap-14 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <SectionHeading eyebrow="Why PowerCare" title="ระบบเดียวที่เข้าใจลำดับงานจริง" description="ออกแบบจาก workflow งานซ่อมและคลังอะไหล่ ไม่ได้หยุดแค่การบันทึกรายการ แต่ช่วยส่งต่องานให้คนถัดไปอย่างชัดเจน" />
        </div>
        <ol className="landing-steps">
          {steps.map(([number, title]) => <li key={number}><span>{number}</span><b>{title}</b></li>)}
        </ol>
      </div>
    </section>
  );
}

function PlatformCapabilities() {
  const capabilities = [
    [Building2, "Multi-organization", "Owner Admin จัดการหลายองค์กรโดยไม่ทำให้ข้อมูลข้ามขอบเขต"],
    [Factory, "Multi-site", "แต่ละ Site มีผู้ดูแล ผู้ใช้ Master Data และ Public Portal ของตัวเอง"],
    [ShieldCheck, "Permission control", "กำหนดสิทธิ์ตามบทบาทและเปิดเฉพาะความสามารถที่จำเป็น"],
    [BarChart3, "Operational analytics", "Dashboard และรายงานช่วยมองสถานะ งานค้าง และแนวโน้มในระดับที่รับผิดชอบ"],
  ] as const;
  return (
    <section className="landing-product-band" id="platform">
      <LandingSectionPhoto scene="campus" />
      <div className="landing-container">
        <SectionHeading eyebrow="Platform capabilities" title="พร้อมขยายจากหนึ่ง Site สู่หลายองค์กร" description="โครงสร้างข้อมูลและสิทธิ์ถูกวางไว้สำหรับการเติบโต โดยยังรักษาความชัดเจนของผู้รับผิดชอบในแต่ละระดับ" centered />
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {capabilities.map(([Icon, title, description]) => <article className="landing-capability" key={title}><Icon size={24} /><h3>{title}</h3><p>{description}</p></article>)}
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  const benefits = [[Gauge, "เห็นสถานะงานเร็วขึ้น"], [ClipboardCheck, "ลดงานตกหล่นระหว่างทีม"], [PackageCheck, "ตรวจสอบการใช้อะไหล่ได้"], [Database, "เก็บข้อมูลพร้อมวิเคราะห์ต่อ"]] as const;
  return (
    <section className="landing-band" id="benefits">
      <LandingSectionPhoto scene="maintenance" />
      <div className="landing-container">
        <SectionHeading eyebrow="Operational benefits" title="เปลี่ยนข้อมูลหน้างานให้ใช้ตัดสินใจได้" description="หน้าจอที่เงียบ ชัด และเหมาะกับการใช้งานซ้ำทุกวัน ช่วยให้ทีมโฟกัสกับงานที่ต้องทำต่อ" />
        <div className="landing-benefits-grid mt-10 grid gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] md:grid-cols-2 xl:grid-cols-4">
          {benefits.map(([Icon, title]) => <div className="landing-benefit" key={title}><Icon size={24} /><b>{title}</b></div>)}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section className="landing-product-band" id="faq">
      <LandingSectionPhoto scene="store" />
      <div className="landing-container grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
        <SectionHeading eyebrow="FAQ" title="คำถามที่พบบ่อย" description="ข้อมูลเบื้องต้นสำหรับองค์กรที่กำลังพิจารณา PowerCare" />
        <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {faqs.map(([question, answer], index) => <details className="landing-faq" key={question} open={index === 0}><summary>{question}<span><X size={17} /></span></summary><p>{answer}</p></details>)}
        </div>
      </div>
    </section>
  );
}

function Feedback({ action, status }: { action: PublicLandingProps["feedbackAction"]; status?: string }) {
  return (
    <section className="landing-product-band" id="feedback">
      <LandingSectionPhoto scene="maintenance" />
      <div className="landing-container grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
        <SectionHeading eyebrow="Platform feedback" title="ช่วยให้ PowerCare ดีขึ้น" description="ส่งความคิดเห็นเกี่ยวกับแพลตฟอร์มถึง Owner Admin โดยตรง ข้อมูลนี้ไม่ผูกกับ Organization หรือ Site ใด" />
        <form action={action} className="landing-feedback-form">
          {status === "success" ? <p className="landing-success" role="status">ส่งความคิดเห็นเรียบร้อยแล้ว ขอบคุณสำหรับคำแนะนำครับ</p> : null}
          {status === "error" ? <p className="landing-error" role="alert">กรุณากรอกชื่อและความคิดเห็นก่อนส่ง</p> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ชื่อ-นามสกุล"><input maxLength={120} name="name" required /></Field>
            <Field label="หน่วยงาน (ไม่บังคับ)"><input maxLength={120} name="department" /></Field>
          </div>
          <Field label="ความคิดเห็น / คำแนะนำ"><textarea maxLength={1500} name="message" required rows={5} /></Field>
          <button className="landing-primary-cta justify-self-end" type="submit">ส่งความคิดเห็น <ArrowRight size={17} /></button>
        </form>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="landing-field"><span>{label}</span>{children}</label>;
}

function SoonCta() {
  return (
    <section className="landing-cta-band">
      <LandingSectionPhoto scene="campus" />
      <div className="landing-container flex flex-col items-start justify-between gap-6 py-14 md:flex-row md:items-center">
        <div><p className="landing-kicker text-white/75">Next step</p><h2 className="mt-3 text-3xl font-extrabold text-white">เตรียม PowerCare ให้พร้อมกับองค์กรของคุณ</h2><p className="mt-3 text-white/70">ช่องทางติดต่อและเริ่มต้นใช้งานกำลังจัดเตรียม</p></div>
        <button aria-disabled="true" className="landing-disabled-cta" disabled title="ช่องทางติดต่อกำลังจัดเตรียม"><span>Soon</span> ติดต่อ PowerCare</button>
      </div>
    </section>
  );
}

function LandingFooter() {
  return <footer className="border-t border-[var(--line)] bg-[var(--surface)]"><div className="landing-container flex flex-col justify-between gap-4 py-8 text-sm text-[var(--muted)] sm:flex-row"><b className="text-[var(--ink)]">PowerCare</b><span>Maintenance operations platform</span><span>© 2026 PowerCare</span></div></footer>;
}

function SectionHeading({ eyebrow, title, description, centered = false }: { eyebrow: string; title: string; description: string; centered?: boolean }) {
  return <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}><p className="landing-kicker">{eyebrow}</p><h2 className="landing-section-title mt-4">{title}</h2><p className="mt-4 leading-7 text-[var(--muted)]">{description}</p></div>;
}
