import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Link } from '@/i18n/routing';
import { ArrowRight, ShieldCheck, Wallet, Lock } from 'lucide-react';

export default function HomePage() {
    const t = useTranslations('HomePage');

    return (
        <div className="flex flex-col min-h-screen">
            {/* Header */}
            <header className="px-6 h-16 flex items-center justify-between border-b bg-background/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="flex items-center gap-2 font-bold text-xl">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                        <Wallet className="w-5 h-5" />
                    </div>
                    Wallet Watch
                </div>
                <nav className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
                    <Link href="#" className="hover:text-foreground transition-colors">Features</Link>
                    <Link href="#" className="hover:text-foreground transition-colors">Security</Link>
                    <Link href="#" className="hover:text-foreground transition-colors">Pricing</Link>
                </nav>
                <div className="flex items-center gap-4">
                    <Link href="/auth/login">
                        <Button variant="ghost" size="sm">Login</Button>
                    </Link>
                    <Link href="/auth/register">
                        <Button size="sm">Get Started</Button>
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center justify-center text-center p-6 md:p-24 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
                <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm text-muted-foreground gap-1">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Passkey Security Enabled
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-foreground to-muted-foreground pb-2">
                        {t('title')}
                    </h1>

                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        {t('subtitle')} Experience the future of crypto management with biometric authentication and real-time monitoring.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                        <Link href="/auth/register">
                            <Button size="lg" className="h-12 px-8 text-lg gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                                {t('getStarted')} <ArrowRight className="w-5 h-5" />
                            </Button>
                        </Link>
                        <Button size="lg" variant="outline" className="h-12 px-8 text-lg">
                            View Demo
                        </Button>
                    </div>
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 w-full max-w-6xl px-4">
                    {[
                        {
                            icon: Lock,
                            title: "Bank-Grade Security",
                            desc: "Powered by WebAuthn Passkeys. Say goodbye to passwords and phishing."
                        },
                        {
                            icon: Wallet,
                            title: "Multi-Wallet Watch",
                            desc: "Track unlimited addresses across Ethereum, Polygon, and more chains."
                        },
                        {
                            icon: ShieldCheck,
                            title: "Privacy First",
                            desc: "Non-custodial. Your keys never leave your device. We just verify you."
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
