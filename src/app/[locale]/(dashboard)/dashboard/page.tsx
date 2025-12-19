import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Activity, ArrowUpRight } from "lucide-react";
import { getUserCases } from '@/modules/cases/cases.actions';
import { DashboardClient } from './dashboard-client';

export default async function DashboardPage() {
    const t = await getTranslations('DashboardOverview');
    const userCases = await getUserCases();

    return (
        <>
            <DashboardClient hasGroups={userCases.length > 0} />
            <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-muted-foreground">{t('subtitle')}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('total_balance')}</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">$0.00</div>
                        <p className="text-xs text-muted-foreground">+0% {t('subtitle') === 'Overview of your wallet activities.' ? 'from last month' : '较上月'}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('active_wallets')}</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">{t('no_wallets_desc')}</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="min-h-[300px] flex items-center justify-center border-dashed">
                <div className="text-center space-y-2">
                    <div className="p-4 bg-muted rounded-full inline-block">
                        <ArrowUpRight className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg">{t('no_activity_title')}</h3>
                    <p className="text-muted-foreground max-w-xs mx-auto">
                        {t('no_activity_desc')}
                    </p>
                </div>
            </Card>
        </div>
        </>
    );
}
