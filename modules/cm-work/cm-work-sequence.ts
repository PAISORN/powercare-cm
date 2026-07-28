import { formatCmWorkNumber } from "./cm-work-number";

type CmNumberSequenceClient = {
  cmNumberSequence: {
    findUnique(input: {
      where: { yearMonth: string };
    }): Promise<{ yearMonth: string; lastNumber: number } | null>;
    upsert(input: {
      where: { yearMonth: string };
      create: { yearMonth: string; lastNumber: number };
      update: { lastNumber: { increment: number } };
    }): Promise<{ yearMonth: string; lastNumber: number }>;
  };
  cmWork: {
    findMany(input: {
      where: { number: { startsWith: string } };
      select: { number: true };
    }): Promise<Array<{ number: string }>>;
  };
};

export async function reserveCmWorkNumber(tx: CmNumberSequenceClient, siteCode: string, date = new Date()) {
  const normalizedSiteCode = siteCode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalizedSiteCode) throw new Error("Site code is required for CM work numbering");
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yearMonth = `${year}-${month}`;
  const siteYearMonth = `${normalizedSiteCode}:${yearMonth}`;
  const prefix = `CM-${normalizedSiteCode}-${yearMonth}-`;
  const existingSequence = await tx.cmNumberSequence.findUnique({ where: { yearMonth: siteYearMonth } });
  let initialNumber = 1;

  if (!existingSequence) {
    const existingWorks = await tx.cmWork.findMany({
      where: { number: { startsWith: prefix } },
      select: { number: true },
    });
    const highestImportedNumber = existingWorks.reduce((highest, work) => {
      const suffix = work.number.slice(prefix.length);
      return /^\d+$/.test(suffix) ? Math.max(highest, Number(suffix)) : highest;
    }, 0);
    initialNumber = highestImportedNumber + 1;
  }

  const sequence = await tx.cmNumberSequence.upsert({
    where: { yearMonth: siteYearMonth },
    create: { yearMonth: siteYearMonth, lastNumber: initialNumber },
    update: { lastNumber: { increment: 1 } },
  });

  return formatCmWorkNumber(normalizedSiteCode, date, sequence.lastNumber);
}
