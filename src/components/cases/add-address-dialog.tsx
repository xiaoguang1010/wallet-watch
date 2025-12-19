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
import { updateCaseAction } from '@/modules/cases/cases.actions';
import { toast } from 'sonner';
import { z } from 'zod';

const addressSchema = z.object({
    addresses: z.array(z.object({
        address: z.string().min(1, "Address is required"),
        chain: z.enum(["BTC", "ETH", "TRON"]),
        network: z.enum(["L1", "L2"]).optional(),
    })).min(1, "At least one address is required"),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface AddAddressDialogProps {
    folderId: string;
    folderName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    existingAddresses?: Array<{ address: string; chain: string; network?: string }>;
}

export function AddAddressDialog({ folderId, folderName, open, onOpenChange, existingAddresses = [] }: AddAddressDialogProps) {
    const t = useTranslations('Dashboard');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<AddressFormData>({
        resolver: zodResolver(addressSchema),
        defaultValues: {
            addresses: existingAddresses.length > 0 
                ? existingAddresses 
                : [{ address: '', chain: 'ETH', network: 'L1' }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "addresses",
    });

    async function onSubmit(data: AddressFormData) {
        setIsSubmitting(true);
        try {
            const result = await updateCaseAction(folderId, {
                name: folderName,
                addresses: data.addresses,
            });

            if (result.error) {
                toast.error(typeof result.error === 'string' ? result.error : "Validation failed");
            } else {
                toast.success("地址添加成功");
                onOpenChange(false);
            }
        } catch (error) {
            toast.error("添加地址失败");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>为「{folderName}」添加监控地址</DialogTitle>
                    <DialogDescription>
                        添加需要监控的区块链地址到此分组。
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
                                    onClick={() => append({ address: '', chain: 'ETH', network: 'L1' })}
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
                                保存地址
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

