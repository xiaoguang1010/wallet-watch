'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { z } from 'zod';
import { toast } from 'sonner';

const addAddressSchema = z.object({
    addresses: z.array(z.object({
        address: z.string().min(1, "Address is required"),
        chain: z.enum(["BTC", "ETH", "TRON"]),
        network: z.enum(["L1", "L2"]).optional(),
        walletName: z.string().max(100).optional(), // 钱包名称
    })).min(1, "At least one address is required")
        .refine((items) => {
            const seen = new Set();
            for (const item of items) {
                const key = `${item.address}-${item.chain}-${item.network || 'L1'}`;
                if (seen.has(key)) return false;
                seen.add(key);
            }
            return true;
        }, { message: "Duplicate address entry" })
        .superRefine((items, ctx) => {
            items.forEach((item, index) => {
                let isValid = true;
                if (item.chain === 'ETH') {
                    isValid = /^0x[a-fA-F0-9]{40}$/.test(item.address);
                } else if (item.chain === 'TRON') {
                    isValid = /^T[a-zA-HJ-NP-Z0-9]{33}$/.test(item.address);
                } else if (item.chain === 'BTC') {
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

type AddAddressInput = z.infer<typeof addAddressSchema>;

interface AddAddressDialogProps {
    folderId: string;
    folderName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddAddressDialog({ folderId, folderName, open, onOpenChange }: AddAddressDialogProps) {
    const t = useTranslations('Dashboard');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<AddAddressInput>({
        resolver: zodResolver(addAddressSchema),
        defaultValues: {
            addresses: [{ address: '', chain: 'ETH', network: 'L1', walletName: '' }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "addresses",
    });

    async function onSubmit(data: AddAddressInput) {
        setIsSubmitting(true);
        try {
            // TODO: Call API to add addresses to existing folder
            const response = await fetch(`/api/cases/${folderId}/addresses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                toast.success("地址添加成功");
                onOpenChange(false);
                form.reset();
            } else {
                toast.error("添加失败");
            }
        } catch (error) {
            toast.error("添加失败");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>添加监控地址</DialogTitle>
                    <DialogDescription>
                        为「{folderName}」添加加密资产监控地址
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <FormLabel>监控地址列表</FormLabel>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({ address: '', chain: 'ETH', network: 'L1', walletName: '' })}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    添加地址
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/20">
                                        <div className="flex-1 space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <FormField
                                                    control={form.control}
                                                    name={`addresses.${index}.chain`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="选择链" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                                                                    <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                                                                    <SelectItem value="TRON">TRON</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`addresses.${index}.network`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="网络" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="L1">Layer 1</SelectItem>
                                                                    <SelectItem value="L2">Layer 2</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <FormField
                                                control={form.control}
                                                name={`addresses.${index}.walletName`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input placeholder="钱包名称（选填）" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`addresses.${index}.address`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input placeholder="输入钱包地址 (0x...)" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="mt-1 text-muted-foreground hover:text-destructive"
                                            onClick={() => remove(index)}
                                            disabled={fields.length === 1}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                取消
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                添加地址
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

