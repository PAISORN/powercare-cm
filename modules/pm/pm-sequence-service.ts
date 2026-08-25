import { formatPmPlanNumber, formatPmWorkNumber, normalizePmSiteCode } from "./pm-numbering";

export type PmSequenceClient = {
  pmPlanSequence: {
    upsert(input: {
      where: { siteCodeSegment_creationDateKey: { siteCodeSegment: string; creationDateKey: string } };
      create: { siteCodeSegment: string; creationDateKey: string; lastNumber: number };
      update: { lastNumber: { increment: number } };
      select: { lastNumber: true };
    }): Promise<{ lastNumber: number }>;
  };
};

export async function reservePmPlanSequence(
  tx: PmSequenceClient,
  siteCode: string,
  creationDateKey: string,
) {
  const siteCodeSegment = normalizePmSiteCode(siteCode);
  const sequence = await tx.pmPlanSequence.upsert({
    where: { siteCodeSegment_creationDateKey: { siteCodeSegment, creationDateKey } },
    create: { siteCodeSegment, creationDateKey, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
    select: { lastNumber: true },
  });
  return {
    siteCodeSegment,
    creationDateKey,
    planSequence: sequence.lastNumber,
    planNumber: formatPmPlanNumber(siteCodeSegment, creationDateKey, sequence.lastNumber),
    workNumber(workSequence: number) {
      return formatPmWorkNumber(siteCodeSegment, creationDateKey, sequence.lastNumber, workSequence);
    },
  };
}
