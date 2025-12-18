'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, Loader2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { createCaseAction, updateCaseAction } from '@/modules/cases/cases.actions';
import { createCaseSchema, CreateCaseInput } from '@/modules/cases/cases.schema';
import { toast } from 'sonner';

interface CaseDialogProps {
    mode: 'create' | 'edit';
    initialData?: CreateCaseInput & { id?: string }; // id required for edit
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function CaseDialog({ mode, initialData, trigger, open: controlledOpen, onOpenChange: controlledOnOpenChange }: CaseDialogProps) {
    const t = useTranslations('Dashboard');
    const [internalOpen, setInternalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setIsOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setInternalOpen;

    const form = useForm<CreateCaseInput>({
        resolver: zodResolver(createCaseSchema),
        defaultValues: {
            name: '',
            description: '',
            addresses: [{ address: '', chain: 'ETH', network: 'L1' }],
        },
    });

    // Reset form when opening or initialData changes
    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && initialData) {
                form.reset(initialData);
            } else if (mode === 'create') {
                form.reset({
                    name: '',
                    description: '',
                    addresses: [{ address: '', chain: 'ETH', network: 'L1' }],
                });
            }
        }
    }, [isOpen, mode, initialData, form]);

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "addresses",
    });

    async function onSubmit(data: CreateCaseInput) {
        setIsSubmitting(true);
        try {
            let result;
            if (mode === 'create') {
                result = await createCaseAction(data);
            } else {
                if (!initialData?.id) throw new Error("Missing ID for edit");
                result = await updateCaseAction(initialData.id, data);
            }

            if (result.error) {
                toast.error(typeof result.error === 'string' ? result.error : "Validation failed");
            } else {
                toast.success(mode === 'create' ? "Case created successfully" : "Case updated successfully");
                setIsOpen(false);
                if (mode === 'create') form.reset();
            }
        } catch (error) {
            toast.error(mode === 'create' ? "Failed to create case" : "Failed to update case");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" className="w-full justify-start gap-2" suppressHydrationWarning>
                        <Plus className="w-4 h-4" />
                        {t('add_case')}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{mode === 'create' ? '创建监控案件' : '编辑案件'}</DialogTitle>
                    <DialogDescription>
                        {mode === 'create' ? '创建一个新的案件来分组监控多个加密资产地址。' : '修改案件信息及监控地址列表。'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>案件名称</FormLabel>
                                    <FormControl>
                                        <Input placeholder="输入案件名称 (e.g. Phishing Scam 2024)" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>描述 (可选)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="描述该案件的背景信息" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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
                            <FormMessage>
                                {form.formState.errors.addresses?.root?.message}
                            </FormMessage>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                                取消
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {mode === 'create' ? '创建案件' : '保存修改'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
