import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Link } from '@/i18n/routing';
import { ArrowRight, Wallet, LayoutDashboard, BellRing, Zap } from 'lucide-react';

export default function HomePage() {
    const t = useTranslations('HomePage');

    return (
        <div className="flex flex-col min-h-screen">
            {/* Header */}
            <header className="px-6 h-16 flex items-center justify-between border-b bg-background/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="flex items-center gap-2 font-bold text-xl">
                    <div className="flex items-center justify-center">
                        <Image src="/imKey.svg" alt="imKey Logo" width={32} height={32} className="w-8 h-8" />
                    </div>
                    imKey
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/auth/login">
                        <Button variant="ghost" size="sm">{t('login')}</Button>
                    </Link>
                    <Link href="/auth/register">
                        <Button size="sm">{t('createAccount')}</Button>
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center justify-center text-center p-6 md:p-24 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
                <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">


                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-foreground to-muted-foreground pb-2">
                        {t('title')}
                    </h1>

                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        {t('subtitle')}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                        <Link href="/auth/register">
                            <Button size="lg" className="h-12 px-8 text-lg gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                                {t('getStarted')} <ArrowRight className="w-5 h-5" />
                            </Button>
                        </Link>

                    </div>
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 w-full max-w-6xl px-4">
                    {[
                        {
                            icon: LayoutDashboard,
                            title: "多地址一屏总览",
                            desc: "按需求自由分组，随时查看各组余额与总额。"
                        },
                        {
                            icon: BellRing,
                            title: "余额变动提醒",
                            desc: "大额流入、流出或异常波动，第一时间提示。"
                        },
                        {
                            icon: Zap,
                            title: "免开发、简单易用",
                            desc: "SaaS 即开即用，无需自建系统，无需区块链背景"
                        }
                    ].map((feature, i) => (
                        <div key={i} className="group p-6 rounded-2xl border bg-card/50 hover:bg-card/80 transition-colors backdrop-blur-sm">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <feature.icon className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                            <p className="text-muted-foreground">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t py-12 px-6 bg-muted/20">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 font-bold">
                        <Wallet className="w-5 h-5 text-muted-foreground" />
                        <span className="text-muted-foreground">Wallet Watch</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        © 2024 Wallet Watch. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
