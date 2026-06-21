import { z } from "zod";

export const announcementInputSchema = z.object({
  title: z.string().trim().min(1, "Announcement title is required").max(160),
  content: z.string().trim().min(1, "Announcement content is required").max(5000),
  publishStart: z.date(),
  publishEnd: z.date(),
  pinned: z.boolean(),
  active: z.boolean(),
  imageFileName: z.string().optional(),
  imageMimeType: z.string().optional(),
  imageFileSize: z.number().int().positive().optional(),
  imageStoragePath: z.string().optional(),
});

export type AnnouncementInput = z.infer<typeof announcementInputSchema>;
