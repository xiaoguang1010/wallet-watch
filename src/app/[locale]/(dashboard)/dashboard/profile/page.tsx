import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserCircle, Mail, Calendar, Globe } from "lucide-react";
import { getCurrentUser } from "@/modules/auth/auth.actions";
import { redirect } from '@/i18n/routing';

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
    const t = await getTranslations('Profile');
    const { locale } = await params;
    
    const userResult = await getCurrentUser();
    
    if (!userResult.success || !userResult.data) {
        redirect({ href: '/auth/login', locale });
    }

    const user = userResult.data;
    
    // 获取用户名的首字母作为头像备用显示
    const initials = user.username.substring(0, 2).toUpperCase();
    
    // 格式化日期
    const formatDate = (date: Date | string) => {
        const d = new Date(date);
        return d.toLocaleDateString(locale, { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-muted-foreground">{t('subtitle')}</p>
            </div>

            {/* 用户信息卡片 */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Avatar className="w-20 h-20">
                            <AvatarImage src={user.avatarUrl || undefined} alt={user.username} />
                            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <CardTitle className="text-2xl">
                                {user.displayName || user.username}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                                <UserCircle className="w-4 h-4" />
                                @{user.username}
                            </CardDescription>
                        </div>
                        <Badge variant="secondary" className="h-fit">
                            {t('active_status')}
                        </Badge>
                    </div>
                </CardHeader>
            </Card>

            {/* 详细信息卡片 */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('account_details')}</CardTitle>
                    <CardDescription>{t('account_details_desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 用户名 */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <UserCircle className="w-4 h-4" />
                                {t('username')}
                            </div>
                            <div className="text-base font-medium">{user.username}</div>
                        </div>

                        {/* 用户ID */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="w-4 h-4" />
                                {t('user_id')}
                            </div>
                            <div className="text-base font-mono text-xs">{user.id}</div>
                        </div>

                        {/* 注册时间 */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                {t('created_at')}
                            </div>
                            <div className="text-base font-medium">{formatDate(user.createdAt)}</div>
                        </div>

                        {/* 语言偏好 */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Globe className="w-4 h-4" />
                                {t('language')}
                            </div>
                            <div className="text-base font-medium">
                                {user.locale === 'zh' ? '简体中文' : 'English'}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 统计信息卡片 */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t('total_groups')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('groups_desc')}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t('total_addresses')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('addresses_desc')}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t('account_age')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('days_since_joined')}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

