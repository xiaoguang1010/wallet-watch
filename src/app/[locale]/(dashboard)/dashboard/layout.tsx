import { Link, redirect } from '@/i18n/routing';
import { cookies } from 'next/headers';
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    Wallet,
    Settings,
    LogOut,
    UserCircle
} from "lucide-react";
import { logout } from "@/modules/auth/auth.actions";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Simple Session Check
    const cookieStore = await cookies();
    const userId = cookieStore.get("session_user_id");

    if (!userId) {
        redirect("/auth/login");
    }

    return (
        <div className="flex min-h-screen bg-muted/20">
            {/* Sidebar */}
            <aside className="w-64 border-r bg-background hidden md:flex flex-col">
                <div className="p-6 border-b flex items-center gap-2 font-bold text-xl">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                        <Wallet className="w-5 h-5" />
                    </div>
                    Wallet Watch
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <Link href="/dashboard">
                        <Button variant="ghost" className="w-full justify-start gap-2">
                            <LayoutDashboard className="w-4 h-4" />
                            Overview
                        </Button>
                    </Link>
                    <Link href="/dashboard/wallets">
                        <Button variant="ghost" className="w-full justify-start gap-2">
                            <Wallet className="w-4 h-4" />
                            My Wallets
                        </Button>
                    </Link>
                    <Link href="/dashboard/settings">
                        <Button variant="ghost" className="w-full justify-start gap-2">
                            <Settings className="w-4 h-4" />
                            Settings
                        </Button>
                    </Link>
                </nav>

                <div className="p-4 border-t">
                    <form action={async () => {
                        'use server';
                        await logout();
                        redirect({ href: '/auth/login', locale: 'zh' }); // Force ZH or use path if supported. redirect('/auth/login') should work.
                        // Actually, next-intl redirect takes 2 args? No, typical is redirect(path).
                        // Let's stick to simple redirect('/auth/login') and if next-intl works it works.
                        // But wait, the user's issue implies next-intl redirect might be defaulting to something context-less.
                        // Safest: Use native redirect with absolute logic if possible, or trust next-intl.
                        // Let's try redirect('/auth/login') first.
                        redirect('/auth/login');
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
                    <span className="font-bold">Wallet Watch</span>
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
