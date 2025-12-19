'use client';

import { useEffect, useState } from 'react';
import { EmptyStateGuide } from '@/components/cases/empty-state-guide';

interface DashboardClientProps {
    hasGroups: boolean;
}

export function DashboardClient({ hasGroups }: DashboardClientProps) {
    const [showGuide, setShowGuide] = useState(false);

    useEffect(() => {
        // 只在没有分组时显示引导
        if (!hasGroups) {
            // 稍微延迟显示，让页面先加载
            const timer = setTimeout(() => {
                setShowGuide(true);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [hasGroups]);

    if (hasGroups) return null;

    return <EmptyStateGuide open={showGuide} onOpenChange={setShowGuide} />;
}

