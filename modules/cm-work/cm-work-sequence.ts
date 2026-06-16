import { formatCmWorkNumber } from "./cm-work-number";

type CmNumberSequenceClient = {
  cmNumberSequence: {
    upsert(input: {
      where: { yearMonth: string };
      create: { yearMonth: string; lastNumber: number };
      update: { lastNumber: { increment: number } };
    }): Promise<{ yearMonth: string; lastNumber: number }>;
  };
};

export async function reserveCmWorkNumber(tx: CmNumberSequenceClient, date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yearMonth = `${year}-${month}`;

  const sequence = await tx.cmNumberSequence.upsert({
    where: { yearMonth },
    create: { yearMonth, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });

  return formatCmWorkNumber(date, sequence.lastNumber);
}
