'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import { deleteCaseAction } from '@/modules/cases/cases.actions';
import { CaseDialog } from './case-dialog';
import { toast } from 'sonner';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertsList } from '@/components/alerts/alerts-list';

interface Token {
    symbol: string;
    name: string;
    address: string;
    balance: string;
    formattedBalance: string;
    decimals: number;
    price: number;
    usdValue: number;
    usdValueFormatted: string;
    tokenStandard: string;
}

interface AddressBalance {
    chain: string;
    address: string;
    tokens: Token[];
    totalValue: number;
    totalValueFormatted: string;
    riskLevel?: number | null; // 风险等级
}

interface CaseDashboardViewProps {
    data: any; // Type from getCaseDetails
}


export function CaseDashboardView({ data }: CaseDashboardViewProps) {
    const t = useTranslations('GroupDetails');
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [addressBalances, setAddressBalances] = useState<Map<string, AddressBalance>>(new Map());
    const [loadingBalances, setLoadingBalances] = useState(true);
    const [totalAssets, setTotalAssets] = useState(0);
    const [assetDistribution, setAssetDistribution] = useState<Array<{ name: string; value: number }>>([]);

    if (!data) return <div>{t('not_found')}</div>;

    // Fetch balances function (extracted for reuse)
    const fetchBalances = useCallback(async (showLoading = false) => {
        if (!data?.id) return;
        
        if (showLoading) {
            setLoadingBalances(true);
        }
        
        try {
                // 为每个地址单独查询余额（支持同一链的多个地址）
                const balancePromises = data.addresses.map(async (addr: any) => {
                    try {
                        const chain = (addr.chain || '').toLowerCase();
                        const addrController = new AbortController();
                        const addrTimeoutId = setTimeout(() => addrController.abort(), 30000);
                        
                        const addrResponse = await fetch(`/api/v1/balance/${chain}/${encodeURIComponent(addr.address)}`, {
                            signal: addrController.signal,
                        });
                        
                        clearTimeout(addrTimeoutId);
                        
                        if (!addrResponse.ok) {
                            console.warn(`Failed to fetch balance for ${addr.address}:`, addrResponse.status);
                            return null;
                        }
                        
                        const addrResult = await addrResponse.json();
                        if (!addrResult.success || !addrResult.data) {
                            return null;
                        }
                        
                        return {
                            addressId: addr.id,
                            address: addr,
                            chainData: addrResult.data,
                        };
                    } catch (error: any) {
                        if (error.name !== 'AbortError') {
                            console.error(`Error fetching balance for ${addr.address}:`, error);
                        }
                        return null;
                    }
                });

                const balanceResults = await Promise.all(balancePromises);
                
                const balanceMap = new Map<string, AddressBalance>();
                
                // 处理每个地址的余额数据
                balanceResults.forEach((result) => {
                    if (!result) return;
                    
                    const { addressId, address, chainData } = result;
                    const chainKey = (address.chain || '').toLowerCase();

                    // Process tokens
                    let tokens: Token[] = [];
                    if (chainKey === 'btc') {
                        // BTC 可能 tokens 为空，需要从 allTokens 或 mainToken 获取
                        tokens = chainData.tokens || [];
                        if (tokens.length === 0) {
                            if (chainData.allTokens && chainData.allTokens.length > 0) {
                                tokens = chainData.allTokens.filter((t: Token) => parseFloat(t.balance || '0') > 0);
                            } else if (chainData.mainToken && parseFloat(chainData.mainToken.balance || '0') > 0) {
                                tokens = [chainData.mainToken];
                            }
                        }
                    } else {
                        // ETH and TRON: 过滤掉 USD 价值小于 1 USDT 的代币
                        tokens = (chainData.tokens || []).filter((token: Token) => {
                            const usdValue = token.usdValue || 0;
                            return usdValue >= 1;
                        });
                    }

                    // 提取风险信息（如果 API 返回中包含）
                    const riskLevel = (chainData as any).riskLevel || (chainData as any).risk || null;
                    
                    balanceMap.set(addressId, {
                        chain: address.chain,
                        address: address.address,
                        tokens,
                        totalValue: chainData.totalValue || 0,
                        totalValueFormatted: chainData.totalValueFormatted || '0.00',
                        riskLevel: riskLevel, // 保存风险等级
                    });
                });

                setAddressBalances(balanceMap);

                // Calculate total assets
                const total = Array.from(balanceMap.values()).reduce((sum, addr) => sum + addr.totalValue, 0);
                setTotalAssets(total);

                // Calculate asset distribution
                const tokenMap = new Map<string, number>();
                balanceMap.forEach((addrBalance) => {
                    addrBalance.tokens.forEach((token) => {
                        const symbol = token.symbol;
                        const currentValue = tokenMap.get(symbol) || 0;
                        tokenMap.set(symbol, currentValue + (token.usdValue || 0));
                    });
                });

                // Convert to percentage distribution
                const distribution: Array<{ name: string; value: number }> = [];
                tokenMap.forEach((value, symbol) => {
                    if (total > 0) {
                        distribution.push({
                            name: symbol,
                            value: Math.round((value / total) * 100),
                        });
                    }
                });

                // Sort by value descending and take top 5
                distribution.sort((a, b) => b.value - a.value);
                setAssetDistribution(distribution.slice(0, 5));

                // 创建余额快照（用于提醒检测）
                try {
                    const snapshots = Array.from(balanceMap.entries()).map(([addrId, balance]) => ({
                        addressId: addrId,
                        balanceData: {
                            tokens: balance.tokens,
                            totalValue: balance.totalValue,
                            totalValueFormatted: balance.totalValueFormatted,
                            chain: balance.chain,
                            address: balance.address,
                            riskLevel: balance.riskLevel, // 保存风险等级到快照
                        },
                    }));

                    if (snapshots.length > 0) {
                        await fetch(`/api/cases/${data.id}/snapshot`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ snapshots }),
                        });
                    }
                } catch (snapshotError) {
                    console.error('Error creating snapshot:', snapshotError);
                    // 快照失败不影响主流程
                }
            } catch (err: any) {
                console.error('Error fetching balances:', err);
                // Set empty balances on error
                setAddressBalances(new Map());
                setTotalAssets(0);
                setAssetDistribution([]);
            } finally {
                setLoadingBalances(false);
            }
    }, [data?.id]);

    // Fetch balances for all addresses
    useEffect(() => {
        fetchBalances(true); // 首次加载显示 loading
        
        // 定期检测余额变化（每5分钟检测一次）
        const interval = setInterval(() => {
            fetchBalances(false); // 定期检测不显示 loading
        }, 5 * 60 * 1000); // 5分钟 = 300,000 毫秒
        
        return () => clearInterval(interval);
    }, [fetchBalances]);

    const handleDelete = async () => {
        if (!confirm(t('delete_confirm'))) return;

        setIsDeleting(true);
        try {
            const result = await deleteCaseAction(data.id);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(t('delete_success'));
                router.push('/dashboard');
            }
        } catch (error) {
            toast.error(t('delete_fail'));
        } finally {
            setIsDeleting(false);
        }
    };

    // Prepare edit data
    const editData = {
        id: data.id,
        name: data.name,
        description: data.description || '',
        addresses: data.addresses || [],
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{data.name}</h1>
                        <p className="text-sm text-gray-500 mt-1">{data.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <CaseDialog
                            mode="edit"
                            initialData={editData}
                            open={isEditOpen}
                            onOpenChange={setIsEditOpen}
                            onSuccess={() => {
                                // 保存成功后立即刷新余额
                                fetchBalances(true);
                                // 刷新页面数据
                                router.refresh();
                            }}
                            trigger={
                                <Button variant="outline" size="sm" suppressHydrationWarning>
                                    <Edit className="w-4 h-4 mr-2" />
                                    {t('edit_group')}
                                </Button>
                            }
                        />

                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('delete')}
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="text-4xl font-bold text-gray-900">{data.stats.addressCount}</div>
                        <div className="text-sm text-gray-500 mt-2">{t('total_address')}</div>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        {loadingBalances ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                <div className="text-3xl font-bold text-gray-900">Loading...</div>
                            </div>
                        ) : (
                            <div className="text-3xl font-bold text-gray-900">
                                $ {totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        )}
                        <div className="text-sm text-gray-500 mt-2">{t('total_assets')}</div>
                    </div>
                </div>

                {/* Alerts List */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <AlertsList caseId={data.id} />
                </div>

                <div className="grid grid-cols-12 gap-6">
                    {/* Asset Distribution Chart */}
                    <div className="col-span-7 bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-medium text-gray-900">{t('asset_dist')}</h3>
                                <p className="text-xs text-gray-500">（按当前币价折算，计算占比）</p>
                            </div>
                        </div>
                        {loadingBalances ? (
                            <div className="flex items-center justify-center h-48">
                                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                            </div>
                        ) : assetDistribution.length > 0 ? (
                            <div className="flex items-center">
                                <div className="w-48 h-48 relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={assetDistribution}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={80}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {assetDistribution.map((entry: any, index: number) => {
                                                    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444'];
                                                    return (
                                                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                                    );
                                                })}
                                            </Pie>
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="bg-white shadow-lg rounded-lg p-3 border">
                                                                <p className="text-sm text-gray-600">{payload[0].name}</p>
                                                                <p className="text-sm">
                                                                    <span
                                                                        className="inline-block w-2 h-2 rounded-full mr-2"
                                                                        style={{ backgroundColor: payload[0].payload.color || '#10B981' }}
                                                                    ></span>
                                                                    资产总额占比 {payload[0].value}%
                                                                </p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Legend */}
                                <div className="ml-8 space-y-3">
                                    {assetDistribution.map((entry: any, index: number) => {
                                        const colors = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444'];
                                        return (
                                            <div key={entry.name} className="flex items-center gap-2">
                                                <span
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: colors[index % colors.length] }}
                                                ></span>
                                                <span className="text-sm text-gray-700">{entry.name}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-48 text-sm text-gray-500">
                                暂无资产数据
                            </div>
                        )}
                    </div>

                    {/* Address List */}
                    <div className="col-span-5 bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-base font-medium text-gray-900 mb-4">{t('addr_list')}</h3>
                        {loadingBalances ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {data.addresses.map((addr: any) => {
                                    const balance = addressBalances.get(addr.id);
                                    return (
                                        <div key={addr.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-gray-900">{addr.chain}</span>
                                                <span className="text-xs text-gray-500">{addr.network}</span>
                                            </div>
                                            <div className="text-xs font-mono text-gray-600 truncate mb-2">{addr.address}</div>
                                            
                                            {/* Balance Info */}
                                            {balance ? (
                                                <div className="mt-2 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-gray-500">Total Value</span>
                                                        <span className="text-sm font-semibold text-gray-900">
                                                            ${balance.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                    {balance.tokens.length > 0 && (
                                                        <div className="mt-2 pt-2 border-t border-gray-100">
                                                            <div className="text-xs text-gray-500 mb-1">Tokens:</div>
                                                            <div className="space-y-1">
                                                                {balance.tokens.map((token, index) => (
                                                                    <div key={`${token.symbol}-${index}`} className="flex items-center justify-between text-xs">
                                                                        <span className="text-gray-700">{token.symbol}</span>
                                                                        <span className="text-gray-600">
                                                                            ${token.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="mt-2 text-xs text-gray-400">No balance data</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
