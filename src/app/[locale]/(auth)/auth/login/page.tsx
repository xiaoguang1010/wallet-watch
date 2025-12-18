'use client';

import { useTranslations } from 'next-intl';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/modules/auth/use-auth";
import { Wallet, Loader2 } from "lucide-react";
import { Link } from '@/i18n/routing';

export default function LoginPage() {
    const t = useTranslations('Auth');
    const [username, setUsername] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { signIn } = useAuth();
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // If username is empty, we trigger usernameless flow (if supported by device)
        await signIn(username || undefined);
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
            <Card className="w-full max-w-md border-0 shadow-2xl bg-background/80 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-2xl">
                            <Wallet className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">{t('welcomeBack')}</CardTitle>
                    <CardDescription>
                        {t('signInSubtitle')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">{t('usernameLabel')}</Label>
                            <Input
                                id="username"
                                placeholder={t('usernamePlaceholder')}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isLoading}
                                className="h-11"
                            />
                        </div>
                        <Button className="w-full h-11 text-base" type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('verifying')}
                                </>
                            ) : (
                                t('signInButton')
                            )}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col gap-4 text-center text-sm text-muted-foreground">
                    <div>
                        {t('noAccount')}{" "}
                        <Link href="/auth/register" className="underline underline-offset-4 hover:text-primary transition-colors">
                            {t('signUpLink')}
                        </Link>
                    </div>
                </CardFooter>
            </Card >
        </div >
    );
}
