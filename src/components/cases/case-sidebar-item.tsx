'use client';

import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Briefcase } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface CaseSidebarItemProps {
    caseId: string;
    name: string;
}

export function CaseSidebarItem({ caseId, name }: CaseSidebarItemProps) {
    const pathname = usePathname();
    const href = `/dashboard/cases/${caseId}`;
    const isActive = pathname.includes(href);

    return (
        <Link href={href}>
            <Button variant={isActive ? "secondary" : "ghost"} className="w-full justify-start gap-2 pl-8">
                <Briefcase className="w-4 h-4" />
                {name}
            </Button>
        </Link>
    );
}
