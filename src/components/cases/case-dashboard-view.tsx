'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Loader2, Wallet, ChevronDown, ChevronUp } from 'lucide-react';
import { deleteCaseAction } from '@/modules/cases/cases.actions';
import { CaseDialog } from './case-dialog';
import { toast } from 'sonner';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertsList } from '@/components/alerts/alerts-list';
import { TransactionList } from './transaction-list';
import { TokenLogo } from '@/components/tokens/token-logo';

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
    const [selectedToken, setSelectedToken] = useState<{ walletAddress: string; address: string; chain: string; token: Token } | null>(null);
    const [expandedTokenSections, setExpandedTokenSections] = useState<Set<string>>(new Set());
    // 近7日余额净变动：目前暂无真实计算逻辑，先将历史的 mock 展示清零。
    const netChange7dUsd = 0;

    if (!data) return <div>{t('not_found')}</div>;

    // Handle token click
    const handleTokenClick = (addressId: string, walletAddress: string, chain: string, token: Token) => {
        setSelectedToken({ 
            address: addressId, 
            walletAddress,
            chain,
            token 
        });
        console.log('Token clicked:', { addressId, walletAddress, chain, token });
    };

    const toggleTokenSection = (addressId: string) => {
        setExpandedTokenSections(prev => {
            const next = new Set(prev);
            if (next.has(addressId)) next.delete(addressId);
            else next.add(addressId);
            return next;
        });
    };

    // Fetch balances function (extracted for reuse)
    const fetchBalances = useCallback(async (showLoading = false) => {
        if (!data?.id || !data?.addresses || data.addresses.length === 0) {
            setLoadingBalances(false);
            return;
        }
        
        if (showLoading) {
            setLoadingBalances(true);
        }
        
        try {
                // 为每个地址单独查询余额（支持同一链的多个地址）
                const balancePromises = data.addresses.map(async (addr: any) => {
                    try {
                        const chain = (addr.chain || '').toLowerCase();
                        const addrController = new AbortController();
                        // 降低超时时间到 9 秒，适应 Vercel 10 秒限制
                        const addrTimeoutId = setTimeout(() => addrController.abort(), 9000);
                        
                        console.log(`[Balance Fetch] Starting request for ${chain} address:`, addr.address);
                        const fetchStartTime = Date.now();
                        
                        const addrResponse = await fetch(`/api/v1/balance/${chain}/${encodeURIComponent(addr.address)}`, {
                            signal: addrController.signal,
                        });
                        
                        clearTimeout(addrTimeoutId);
                        
                        const fetchDuration = Date.now() - fetchStartTime;
                        console.log(`[Balance Fetch] Response received in ${fetchDuration}ms for ${chain} address, status:`, addrResponse.status);
                        
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
    }, [data?.id, data?.addresses]);

    // Fetch balances for all addresses
    useEffect(() => {
        fetchBalances(true); // 首次加载显示 loading
        
        // 定期检测余额变化（每5分钟检测一次）
        const interval = setInterval(() => {
            fetchBalances(false); // 定期检测不显示 loading
        }, 5 * 60 * 1000); // 5分钟 = 300,000 毫秒
        
        return () => clearInterval(interval);
    }, [fetchBalances]); // fetchBalances 已依赖 data.addresses，所以地址变化时会自动重新获取

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
        // 用 directAddresses（仅当前分组的地址）来编辑，避免把子分组地址写回当前分组导致重复展示
        addresses: data.directAddresses || data.addresses || [],
    };

    // 判断是否为"所有分组"视图（虚拟汇总视图，不显示编辑/删除按钮）
    const isAllCasesView = data.id === 'all-cases';

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="space-y-6">
                {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                        <h1 className="text-3xl font-bold text-gray-900">{data.name}</h1>
                        <p className="text-sm text-gray-500 mt-1">{data.description}</p>
                </div>
                    {!isAllCasesView && (
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
                    )}
                </div>

                {/* Stats and Chart Section */}
                <div className="grid grid-cols-12 gap-6">
                    {/* Left Side: Stats Cards (2x2 grid) */}
                    <div className="col-span-6">
                        <div className="grid grid-cols-2 gap-4 h-full">
                            {/* 左上: 资产组 */}
                            <div className="bg-white rounded-lg border border-gray-200 p-8 flex flex-col justify-center">
                                <div className="text-5xl font-bold text-gray-900 mb-6">
                                    {isAllCasesView ? data.stats.caseCount : '1'}
                                </div>
                                <div className="text-sm text-gray-500">
                                    {isAllCasesView ? '资产组' : '资产组'}
                                </div>
                            </div>

                            {/* 右上: 钱包地址数 */}
                            <div className="bg-white rounded-lg border border-gray-200 p-8 flex flex-col justify-center">
                                <div className="text-5xl font-bold text-gray-900 mb-6">
                                    {data.stats.addressCount}
                                </div>
                                <div className="text-sm text-gray-500">钱包地址数</div>
            </div>

                            {/* 左下: 管理资产总额 */}
                            <div className="bg-white rounded-lg border border-gray-200 p-8 flex flex-col justify-center">
                                {loadingBalances ? (
                                    <div className="flex items-center gap-2 mb-6">
                                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                        <div className="text-3xl font-bold text-gray-900">...</div>
                                    </div>
                                ) : (
                                    <div className="text-3xl font-bold text-gray-900 mb-6">
                                        $ {totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                )}
                                <div className="text-sm text-gray-500">管理资产总额（按当前币价折算）</div>
                            </div>

                            {/* 右下: 近7日余额净变动 */}
                            <div className="bg-white rounded-lg border border-gray-200 p-8 flex flex-col justify-center">
                                <div
                                    className="text-3xl font-bold mb-6 text-gray-900"
                                >
                                    {loadingBalances ? (
                                        '...'
                                    ) : (
                                        `$ ${netChange7dUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                                    )}
                                </div>
                                <div className="text-sm text-gray-500">近7日余额净变动</div>
                            </div>
                        </div>
            </div>

                    {/* Right Side: Asset Distribution Chart */}
                    <div className="col-span-6 bg-white rounded-lg border border-gray-200 p-6 h-full">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-medium text-gray-900">资产组成</h3>
                                <p className="text-xs text-gray-500">（按当前币价折算，计算占比）</p>
                            </div>
                            <button className="text-sm text-blue-600 hover:text-blue-700">更多 »</button>
                        </div>
                        {loadingBalances ? (
                            <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
                                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                            </div>
                        ) : assetDistribution.length > 0 ? (
                            <div className="flex items-center justify-center gap-12 h-full">
                                {/* Pie Chart */}
                                <div className="relative" style={{ width: '380px', height: '380px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                                data={assetDistribution}
                                    cx="50%"
                                    cy="50%"
                                                innerRadius={0}
                                                outerRadius={160}
                                    dataKey="value"
                                                stroke="none"
                                            >
                                                {assetDistribution.map((entry: any, index: number) => {
                                                    const colors = ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'];
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
                                                                        style={{ backgroundColor: payload[0].payload.fill }}
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

                                {/* Legend - 右侧 */}
                                <div className="flex flex-col gap-6">
                                    {assetDistribution.map((entry: any, index: number) => {
                                        const colors = ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'];
                                        return (
                                            <div key={entry.name} className="flex items-center gap-3">
                                                <span
                                                    className="w-4 h-4 rounded-full"
                                                    style={{ backgroundColor: colors[index % colors.length] }}
                                                ></span>
                                                <span className="text-base text-gray-700">{entry.name}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center text-sm text-gray-500" style={{ minHeight: '400px' }}>
                                暂无资产数据
                            </div>
                        )}
                    </div>
                </div>

                {/* Alerts List - 只在非"所有分组"视图时显示 */}
                {!isAllCasesView && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <AlertsList caseId={data.id} />
                    </div>
                )}

                {/* Address List - 卡片式展示（含 Tokens，可点击查看交易） */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {data.addresses.map((addr: any) => {
                        const balance = addressBalances.get(addr.id);
                        const chainUpper = (addr.chain?.toUpperCase?.() ?? String(addr.chain || '').toUpperCase()) as string;
                        const supportsTransactions = chainUpper === 'ETH' || chainUpper === 'BTC';
                        const addressId = String(addr.id);
                        const tokensExpanded = expandedTokenSections.has(addressId);

                        return (
                            <div key={addr.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                            <Wallet className="w-4 h-4 text-gray-600" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-900">{data.name}</span>
                                    </div>
                                    <span className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded">Owner</span>
                                </div>

                                {/* Address */}
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-gray-500">{addr.chain} · {addr.network}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-mono text-gray-600 truncate flex-1">{addr.address}</span>
                                        <button
                                            onClick={() => navigator.clipboard?.writeText?.(addr.address)}
                                            className="p-1 hover:bg-gray-100 rounded"
                                            title="复制地址"
                                            type="button"
                                        >
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Balance + Tokens */}
                                {loadingBalances ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                    </div>
                                ) : balance ? (
                                    <div className="border-t border-gray-100 pt-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-gray-500">Total Value</div>
                                            <div className="text-lg font-bold text-gray-900">
                                                $ {balance.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>

                                        {balance.tokens?.length > 0 && (
                                            <div className="pt-2 border-t border-gray-100">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="text-xs text-gray-500">
                                                        Tokens ({balance.tokens.length})
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="text-xs text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                                                        onClick={() => toggleTokenSection(addressId)}
                                                        aria-expanded={tokensExpanded}
                                                        aria-controls={`tokens-${addressId}`}
                                                    >
                                                        {tokensExpanded ? 'Hide' : 'Show all'}
                                                        {tokensExpanded ? (
                                                            <ChevronUp className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <ChevronDown className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                </div>

                                                {tokensExpanded && (
                                                    <div id={`tokens-${addressId}`} className="space-y-1">
                                                        {balance.tokens.map((token, index) => {
                                                            const key = `${token.symbol}-${index}`;
                                                            const row = (
                                                                <>
                                                                    <span className="flex items-center gap-2 font-medium text-gray-700">
                                                                        <TokenLogo symbol={token.symbol} size={16} className="shrink-0" />
                                                                        {token.symbol}
                                                                        {!supportsTransactions && (
                                                                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">即将支持</span>
                                                                        )}
                                                                    </span>
                                                                    <span className="text-gray-600">
                                                                        ${token.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </span>
                                                                </>
                                                            );

                                                            return supportsTransactions ? (
                                                                <button
                                                                    key={key}
                                                                    onClick={() => handleTokenClick(addr.id, addr.address, addr.chain, token)}
                                                                    className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-gray-50 transition-colors cursor-pointer"
                                                                    type="button"
                                                                >
                                                                    {row}
                                                                </button>
                                                            ) : (
                                                                <div
                                                                    key={key}
                                                                    className="w-full flex items-center justify-between px-2 py-1.5 text-xs"
                                                                    title={`${addr.chain} 交易查询功能即将支持`}
                                                                >
                                                                    {row}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="border-t border-gray-100 pt-4">
                                        <div className="text-sm text-gray-400 text-center py-4">暂无余额数据</div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Transaction History Section */}
                {selectedToken && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <TransactionList
                            address={selectedToken.walletAddress}
                            tokenSymbol={selectedToken.token.symbol}
                            tokenAddress={selectedToken.token.address !== '0x0000000000000000000000000000000000000000' ? selectedToken.token.address : undefined}
                            chainId="1"
                            chainType={selectedToken.chain?.toUpperCase() as 'ETH' | 'BTC' | 'TRON'}
                            onClose={() => setSelectedToken(null)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
