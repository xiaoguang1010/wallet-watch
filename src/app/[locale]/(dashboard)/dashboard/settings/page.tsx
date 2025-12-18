import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function SettingsPage() {
    const t = useTranslations('Settings');

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-muted-foreground">Manage your account preferences and settings.</p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('language')}</CardTitle>
                        <CardDescription>Select your preferred language for the interface.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label>{t('language')}</Label>
                            </div>
                            <LanguageSwitcher />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
