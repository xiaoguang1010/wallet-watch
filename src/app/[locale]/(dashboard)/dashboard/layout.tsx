import { Link, redirect } from '@/i18n/routing';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    Wallet,
    Settings,
    LogOut,
    UserCircle
} from "lucide-react";
import { logout, getCurrentUser } from "@/modules/auth/auth.actions";
import { CaseDialog } from '@/components/cases/case-dialog';
import { CaseSidebarItem } from '@/components/cases/case-sidebar-item';
import { getUserCases } from '@/modules/cases/cases.actions';

export default async function DashboardLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    // Simple Session Check
    const cookieStore = await cookies();
    const userId = cookieStore.get("session_user_id");
    const { locale } = await params;

    if (!userId) {
        redirect({ href: "/auth/login", locale });
    }

    const t = await getTranslations('Dashboard');
    const userCases = await getUserCases();

    return (
        <div className="flex min-h-screen bg-muted/20">
            {/* Sidebar */}
            <aside className="w-64 border-r bg-background hidden md:flex flex-col">
                <div className="p-6 border-b flex items-center gap-2 font-bold text-xl">
                    <div className="flex items-center justify-center">
                        <Image src="/imKey.svg" alt="imKey Logo" width={32} height={32} className="w-8 h-8" />
                    </div>
                    Asset Watch
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <Link href="/dashboard">
                        <Button variant="ghost" className="w-full justify-start gap-2">
                            <LayoutDashboard className="w-4 h-4" />
                            {t('overview')}
                        </Button>
                    </Link>

                    <div className="pt-4 pb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('groups')}
                    </div>
                    <CaseDialog mode="create" />

                    <div className="space-y-1 mt-1">
                        {userCases.map((c) => (
                            <CaseSidebarItem key={c.id} caseId={c.id} name={c.name} />
                        ))}
                    </div>

                    <div className="pt-4 pb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('settings_section')}
                    </div>

                    <Link href="/dashboard/settings">
                        <Button variant="ghost" className="w-full justify-start gap-2">
                            <Settings className="w-4 h-4" />
                            {t('settings')}
                        </Button>
                    </Link>
                </nav>

                <div className="p-4 border-t">
                    <form action={async () => {
                        'use server';
                        await logout();
                        redirect({ href: '/auth/login', locale });
                    }}>
                        <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive">
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </Button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                {/* Mobile Header (simplified) */}
                <header className="h-16 md:hidden border-b bg-background flex items-center px-4 justify-between">
                    <span className="font-bold">Asset Watch</span>
                    <Button variant="ghost" size="icon">
                        <LayoutDashboard className="w-5 h-5" />
                    </Button>
                </header>

                <div className="flex-1 p-6 md:p-8 overflow-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
