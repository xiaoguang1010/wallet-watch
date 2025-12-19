'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';
import { getCaseAlerts, markAlertAsRead, markAllAlertsAsRead } from '@/modules/alerts/alerts.actions';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface Alert {
    id: string;
    caseId: string;
    addressId: string | null;
    alertType: string;
    title: string;
    message: string;
    details: any;
    severity: 'info' | 'warning' | 'error';
    isRead: boolean;
    triggeredAt: Date | string;
}

interface AlertsListProps {
    caseId: string;
}

export function AlertsList({ caseId }: AlertsListProps) {
    const t = useTranslations('Alerts');
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAlerts() {
            setLoading(true);
        const alertsData = await getCaseAlerts(caseId);
        // 确保类型正确
        const typedAlerts: Alert[] = (alertsData || []).map((alert: any) => ({
            ...alert,
            severity: (alert.severity === 'error' || alert.severity === 'warning' || alert.severity === 'info') 
                ? alert.severity 
                : 'warning' as 'info' | 'warning' | 'error',
            isRead: Boolean(alert.isRead),
        }));
        setAlerts(typedAlerts);
            setLoading(false);
        }

        fetchAlerts();
        // 每30秒刷新一次
        const interval = setInterval(fetchAlerts, 30000);
        return () => clearInterval(interval);
    }, [caseId]);

    const handleMarkAsRead = async (alertId: string) => {
        await markAlertAsRead(alertId);
        setAlerts((prev) =>
            prev.map((alert) =>
                alert.id === alertId ? { ...alert, isRead: true } : alert
            )
        );
    };

    const handleMarkAllAsRead = async () => {
        await markAllAlertsAsRead(caseId);
        setAlerts((prev) => prev.map((alert) => ({ ...alert, isRead: true })));
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'error':
                return <XCircle className="w-5 h-5 text-red-500" />;
            case 'warning':
                return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            case 'info':
                return <Info className="w-5 h-5 text-blue-500" />;
            default:
                return <AlertTriangle className="w-5 h-5 text-gray-500" />;
        }
    };

    const getSeverityColor = (severity: string, isNegative?: boolean) => {
        if (severity === 'error') {
            return isNegative ? 'text-red-600' : 'text-red-500';
        }
        if (severity === 'warning') {
            return 'text-amber-600';
        }
        return 'text-blue-600';
    };

    const formatDate = (date: Date | string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
                <div className="text-sm text-gray-500">加载中...</div>
            </div>
        );
    }

    if (alerts.length === 0) {
        return (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500">暂无提醒</div>
            </div>
        );
    }

    const unreadCount = alerts.filter((a) => !Boolean(a.isRead)).length;

    return (
        <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">
                    提醒列表 {unreadCount > 0 && `(${unreadCount} 条未读)`}
                </h3>
                {unreadCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkAllAsRead}
                        className="text-xs"
                    >
                        全部标记为已读
                    </Button>
                )}
            </div>
            <div className="space-y-2">
                {alerts.map((alert) => (
                    <div
                        key={alert.id}
                        className={`flex items-start justify-between p-2 rounded ${
                            !alert.isRead ? 'bg-white' : 'bg-transparent'
                        }`}
                    >
                        <div className="flex items-start gap-2 flex-1">
                            {getSeverityIcon(alert.severity)}
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`text-sm ${
                                            alert.isRead
                                                ? 'text-gray-500'
                                                : getSeverityColor(
                                                      alert.severity,
                                                      alert.message.includes('转出') ||
                                                          alert.message.includes('减少')
                                                  )
                                        }`}
                                    >
                                        {formatDate(alert.triggeredAt)} - {alert.title}
                                    </span>
                                </div>
                                <div
                                    className={`text-xs mt-1 ${
                                        alert.isRead
                                            ? 'text-gray-400'
                                            : 'text-gray-700'
                                    }`}
                                >
                                    {alert.message}
                                </div>
                            </div>
                        </div>
                                {!Boolean(alert.isRead) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsRead(alert.id)}
                                className="ml-2 h-6 w-6 p-0"
                            >
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            </Button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

