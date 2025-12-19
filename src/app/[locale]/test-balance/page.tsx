'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Loader2 } from "lucide-react";

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

interface WalletChain {
    chain: string;
    address: string;
    tokens: Token[];
    totalValue: number;
    totalValueFormatted: string;
}

const WALLET_ADDRESSES = {
    btc: 'bc1qq2mvrp4g3ugd424dw4xv53rgsf8szkrv853jrc',
    eth: '0x16ac14eF9d1834c31828f4958aa4a6693846C901',
    tron: 'TH1tFgoYEsPtz11vEbbSfiERUiVrcNTS3v',
};

export default function TestBalancePage() {
    const [wallets, setWallets] = useState<WalletChain[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchBalances() {
            setLoading(true);
            setError(null);

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);
                
                const response = await fetch('/api/group1-balances', {
                    signal: controller.signal,
                });
                
                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || 'Failed to fetch balances');
                }

                const data = result.data;
                const walletChains: WalletChain[] = [];

                // Process BTC
                if (data.chains.btc) {
                    const btcChain = data.chains.btc;
                    // BTC 可能 tokens 为空，需要从 allTokens 或 mainToken 获取
                    let btcTokens = btcChain.tokens || [];
                    if (btcTokens.length === 0) {
                        if (btcChain.allTokens && btcChain.allTokens.length > 0) {
                            // 使用 allTokens 中余额大于 0 的代币
                            btcTokens = btcChain.allTokens.filter((t: Token) => parseFloat(t.balance || '0') > 0);
                        } else if (btcChain.mainToken && parseFloat(btcChain.mainToken.balance || '0') > 0) {
                            btcTokens = [btcChain.mainToken];
                        }
                    }
                    walletChains.push({
                        chain: 'BTC',
                        address: WALLET_ADDRESSES.btc,
                        tokens: btcTokens,
                        totalValue: btcChain.totalValue || 0,
                        totalValueFormatted: btcChain.totalValueFormatted || '0.00',
                    });
                } else {
                    walletChains.push({
                        chain: 'BTC',
                        address: WALLET_ADDRESSES.btc,
                        tokens: [],
                        totalValue: 0,
                        totalValueFormatted: '0.00',
                    });
                }

                // Process ETH
                if (data.chains.eth) {
                    const ethChain = data.chains.eth;
                    // 过滤掉 USD 价值小于 1 USDT 的代币
                    const ethTokens = (ethChain.tokens || []).filter((token: Token) => {
                        // 使用 usdValue 字段，而不是 usdValueFormatted（可能包含 "< 0.01" 字符串）
                        const usdValue = token.usdValue || 0;
                        return usdValue >= 1;
                    });
                    walletChains.push({
                        chain: 'ETH',
                        address: WALLET_ADDRESSES.eth,
                        tokens: ethTokens,
                        totalValue: ethChain.totalValue || 0,
                        totalValueFormatted: ethChain.totalValueFormatted || '0.00',
                    });
                } else {
                    walletChains.push({
                        chain: 'ETH',
                        address: WALLET_ADDRESSES.eth,
                        tokens: [],
                        totalValue: 0,
                        totalValueFormatted: '0.00',
                    });
                }

                // Process TRON
                if (data.chains.tron) {
                    const tronChain = data.chains.tron;
                    // 过滤掉 USD 价值小于 1 USDT 的代币
                    const tronTokens = (tronChain.tokens || []).filter((token: Token) => {
                        // 使用 usdValue 字段，而不是 usdValueFormatted（可能包含 "< 0.01" 字符串）
                        const usdValue = token.usdValue || 0;
                        return usdValue >= 1;
                    });
                    walletChains.push({
                        chain: 'TRON',
                        address: WALLET_ADDRESSES.tron,
                        tokens: tronTokens,
                        totalValue: tronChain.totalValue || 0,
                        totalValueFormatted: tronChain.totalValueFormatted || '0.00',
                    });
                } else {
                    walletChains.push({
                        chain: 'TRON',
                        address: WALLET_ADDRESSES.tron,
                        tokens: [],
                        totalValue: 0,
                        totalValueFormatted: '0.00',
                    });
                }

                setWallets(walletChains);
            } catch (err: any) {
                console.error('Error fetching balances:', err);
                setError(err.message || 'Failed to fetch wallet balances');
                setWallets([
                    { chain: 'BTC', address: WALLET_ADDRESSES.btc, tokens: [], totalValue: 0, totalValueFormatted: '0.00' },
                    { chain: 'ETH', address: WALLET_ADDRESSES.eth, tokens: [], totalValue: 0, totalValueFormatted: '0.00' },
                    { chain: 'TRON', address: WALLET_ADDRESSES.tron, tokens: [], totalValue: 0, totalValueFormatted: '0.00' },
                ]);
            } finally {
                setLoading(false);
            }
        }

        fetchBalances();
    }, []);

    const totalUsdValue = wallets.reduce((sum, wallet) => sum + wallet.totalValue, 0);

    if (loading) {
        return (
            <div className="min-h-screen bg-background p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-center min-h-[400px]">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">余额测试页面</h1>
                    <p className="text-muted-foreground">此页面用于测试钱包余额显示功能，无需登录</p>
                </div>

                {/* Summary Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wallet className="w-5 h-5" />
                            Total Value
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            ${totalUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                            Combined value of all wallets
                        </p>
                    </CardContent>
                </Card>

                {/* Wallet Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    {wallets.map((wallet) => (
                        <Card key={wallet.chain}>
                            <CardHeader>
                                <CardTitle className="text-lg">{wallet.chain}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Address</p>
                                    <p className="text-xs font-mono break-all text-foreground">
                                        {wallet.address}
                                    </p>
                                </div>
                                
                                {/* Total Value */}
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Total USD Value</p>
                                    <p className="text-xl font-semibold text-primary">
                                        ${wallet.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>

                                {/* Tokens List */}
                                <div>
                                    <p className="text-sm text-muted-foreground mb-2">Tokens</p>
                                    {wallet.tokens.length > 0 ? (
                                        <div className="space-y-3">
                                            {wallet.tokens.map((token, index) => (
                                                <div key={`${token.symbol}-${index}`} className="border-b pb-2 last:border-0 last:pb-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-semibold">{token.symbol}</span>
                                                        <span className="text-sm text-muted-foreground">
                                                            {token.usdValueFormatted.startsWith('<') 
                                                                ? token.usdValueFormatted 
                                                                : `$${parseFloat(token.usdValue || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {token.formattedBalance} {token.symbol}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No tokens found</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {error && (
                    <Card className="border-destructive">
                        <CardContent className="pt-6">
                            <p className="text-sm text-destructive">{error}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                                Please ensure the balance API is running or check your network connection.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
