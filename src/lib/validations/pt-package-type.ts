import { z } from "zod";

export const ptPackageTypeSchema = z.object({
  sessions: z.union([
    z.literal(1),
    z.literal(5),
    z.literal(10),
    z.literal(20),
    z.literal(30),
    z.literal(40),
    z.string().transform((val) => {
      const num = parseInt(val);
      if ([1, 5, 10, 20, 30, 40].includes(num)) {
        return num as 1 | 5 | 10 | 20 | 30 | 40;
      }
      throw new Error("Invalid sessions value");
    }),
  ]),
  name: z.string().min(1, "Name is required"),
  shortName: z.string().min(1, "Short name is required"),
  price: z.number().min(0, "Price must be positive"),
  pricePerSession: z.number().min(0, "Price per session must be positive").optional(),
  description: z.string().optional(),
  validityDays: z.number().min(1).optional(),
  isActive: z.boolean().default(true),
});

export type PTPackageTypeFormInput = z.input<typeof ptPackageTypeSchema>;

