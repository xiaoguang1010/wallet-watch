'use client';

import { FolderPlus, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface EmptyStateGuideProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onTriggerCreateRoot?: () => void;
}

export function EmptyStateGuide({ open, onOpenChange, onTriggerCreateRoot }: EmptyStateGuideProps) {
    const t = useTranslations('EmptyState');

    const handleCreateClick = () => {
        onOpenChange(false); // 关闭引导 modal
        setTimeout(() => {
            onTriggerCreateRoot?.(); // 触发侧边栏的内联输入
        }, 150); // 稍微延迟，让关闭动画完成
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="space-y-4">
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full inline-block">
                                <FolderPlus className="w-12 h-12 text-primary" />
                            </div>
                            <div className="absolute -top-1 -right-1 animate-pulse">
                                <Sparkles className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                            </div>
                        </div>
                    </div>
                    <DialogTitle className="text-center text-2xl">
                        {t('title')}
                    </DialogTitle>
                    <DialogDescription className="text-center text-base leading-relaxed">
                        {t('description')}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3 mt-4">
                    <Button
                        onClick={handleCreateClick}
                        size="lg"
                        className="w-full gap-2"
                    >
                        <FolderPlus className="w-5 h-5" />
                        {t('create_button')}
                    </Button>
                    <Button
                        onClick={() => onOpenChange(false)}
                        variant="ghost"
                        size="sm"
                    >
                        {t('skip_button')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

