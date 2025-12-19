import { z } from 'zod';

// Zod Schema for Create Folder (Case)
export const createCaseSchema = z.object({
    name: z.string().min(1, "Folder name is required").max(100),
    description: z.string().optional(),
    parentId: z.string().uuid().optional().nullable(), // Parent folder ID
    addresses: z.array(z.object({
        address: z.string().min(1, "Address is required"),
        chain: z.enum(["BTC", "ETH", "TRON"]),
        network: z.enum(["L1", "L2"]).optional(),
    })).min(1, "At least one address is required")
        .refine((items) => {
            const seen = new Set();
            for (const item of items) {
                const key = `${item.address}-${item.chain}-${item.network || 'L1'}`;
                if (seen.has(key)) return false;
                seen.add(key);
            }
            return true;
        }, { message: "Duplicate address entry (Address + Chain + Network must be unique)" })
        .superRefine((items, ctx) => {
            items.forEach((item, index) => {
                let isValid = true;
                if (item.chain === 'ETH') {
                    isValid = /^0x[a-fA-F0-9]{40}$/.test(item.address);
                } else if (item.chain === 'TRON') {
                    isValid = /^T[a-zA-HJ-NP-Z0-9]{33}$/.test(item.address);
                } else if (item.chain === 'BTC') {
                    // Simplified BTC regex (Legacy, Segwit, Taproot)
                    isValid = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/.test(item.address);
                }

                if (!isValid) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `Invalid ${item.chain} address format`,
                        path: [index, 'address']
                    });
                }
            });
        }),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
