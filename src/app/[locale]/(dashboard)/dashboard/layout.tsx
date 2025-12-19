import { Link, redirect } from '@/i18n/routing';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    Settings,
    LogOut,
    UserCircle,
    ChevronDown
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { logout, getCurrentUser } from "@/modules/auth/auth.actions";
import { getUserCasesTree } from '@/modules/cases/cases.actions';
import { LayoutWrapper } from './layout-wrapper';

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
    const tMenu = await getTranslations('UserMenu');
    const folderTree = await getUserCasesTree();
    
    const userResult = await getCurrentUser();
    const user = userResult.success ? userResult.data : null;
    const userInitials = user?.username.substring(0, 2).toUpperCase() || 'U';

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
                    
                    <LayoutWrapper folders={folderTree} />
                </nav>

                <div className="p-4 border-t">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-3">
                                <Avatar className="w-8 h-8">
                                    <AvatarImage src={user?.avatarUrl || undefined} alt={user?.username} />
                                    <AvatarFallback>{userInitials}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-left">
                                    <div className="text-sm font-medium">{user?.displayName || user?.username}</div>
                                    <div className="text-xs text-muted-foreground">@{user?.username}</div>
                                </div>
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{user?.displayName || user?.username}</p>
                                    <p className="text-xs leading-none text-muted-foreground">@{user?.username}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <Link href="/dashboard/profile">
                                <DropdownMenuItem>
                                    <UserCircle className="mr-2 h-4 w-4" />
                                    <span>{tMenu('profile')}</span>
                                </DropdownMenuItem>
                            </Link>
                            <Link href="/dashboard/settings">
                                <DropdownMenuItem>
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>{tMenu('settings')}</span>
                                </DropdownMenuItem>
                            </Link>
                            <DropdownMenuSeparator />
                            <form action={async () => {
                                'use server';
                                await logout();
                                redirect({ href: '/auth/login', locale });
                            }}>
                                <button type="submit" className="w-full">
                                    <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>{tMenu('signOut')}</span>
                                    </DropdownMenuItem>
                                </button>
                            </form>
                        </DropdownMenuContent>
                    </DropdownMenu>
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
