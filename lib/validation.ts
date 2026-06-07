import { z } from "zod";
import { Urgency } from "../modules/cm-work/cm-work-types";

export const repairRequestSchema = z.object({
  requesterName: z.string().trim().min(1, "กรุณาระบุชื่อผู้แจ้ง"),
  requesterDepartment: z.string().trim().min(1, "กรุณาระบุหน่วยงาน"),
  categoryId: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  zoneId: z.string().min(1, "กรุณาเลือก Zone"),
  machineName: z.string().trim().min(1, "กรุณาระบุชื่อเครื่องจักร"),
  problemTitle: z.string().trim().min(1, "กรุณาระบุหัวข้อปัญหา"),
  problemDetail: z.string().trim().min(1, "กรุณาระบุรายละเอียดปัญหา"),
  urgency: z.enum([Urgency.NORMAL, Urgency.URGENT, Urgency.CRITICAL]),
});

export const workCompletionSchema = z.object({
  rootCause: z.string().trim().min(1, "กรุณาระบุสาเหตุ"),
  correctiveAction: z.string().trim().min(1, "กรุณาระบุวิธีการแก้ไข"),
  workNote: z.string().trim().optional(),
});

export const reasonSchema = z.object({
  reason: z.string().trim().min(1, "กรุณาระบุเหตุผล"),
});
