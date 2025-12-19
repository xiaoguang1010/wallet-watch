'use client';

import { useState, useEffect } from 'react';
import { Loader2, ExternalLink, ArrowUpRight, ArrowDownLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Transaction {
    txHash: string;
    from: string;
    to: string;
    value: string;
    decimal: number;
    fee: string;
    blockNumber: number;
    blockTimestamp: number;
    status: number;
    statusText: string;
    direction: string;
    symbol: string;
    name: string;
    tokenType: string;
    contractAddress?: string;
    functionName?: string;
}

interface TransactionListProps {
    address: string;
    tokenSymbol: string;
    tokenAddress?: string;
    chainId?: string;
    chainType?: 'ETH' | 'BTC' | 'TRON';
    onClose?: () => void;
}

export function TransactionList({ 
    address, 
    tokenSymbol, 
    tokenAddress,
    chainId = '1',
    chainType = 'ETH',
    onClose 
}: TransactionListProps) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTransactions();
    }, [address, tokenAddress, chainType]);

    const fetchTransactions = async () => {
        setLoading(true);
        setError(null);

        try {
            // 根据链类型选择API endpoint
            const chainPath = chainType.toLowerCase(); // 'eth', 'btc', 'tron'
            const url = new URL(`/api/v1/transactions/${chainPath}/${encodeURIComponent(address)}`, window.location.origin);
            url.searchParams.set('chainId', chainId);
            
            // 只有ETH支持contractAddress参数
            if (chainType === 'ETH' && tokenAddress) {
                url.searchParams.set('contractAddress', tokenAddress);
            }

            const response = await fetch(url.toString());
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch transactions');
            }

            setTransactions(result.data.transactions || []);
        } catch (err: any) {
            console.error('Error fetching transactions:', err);
            setError(err.message || 'Failed to fetch transactions');
        } finally {
            setLoading(false);
        }
    };

    const formatValue = (value: string, decimals: number = 18): string => {
        if (!value || value === '0') return '0';
        try {
            const valueBN = BigInt(value);
            const divisor = BigInt(10 ** decimals);
            const result = Number(valueBN) / Number(divisor);
            return result.toFixed(6).replace(/\.?0+$/, '');
        } catch {
            return '0';
        }
    };

    const formatDate = (timestamp: number): string => {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const shortenAddress = (addr: string): string => {
        if (!addr || addr === 'N/A') return addr;
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const getExplorerUrl = (txHash: string): string => {
        // 根据链类型返回不同的浏览器URL
        switch (chainType) {
            case 'BTC':
                return `https://blockchair.com/bitcoin/transaction/${txHash}`;
            case 'ETH':
                return `https://etherscan.io/tx/${txHash}`;
            case 'TRON':
                return `https://tronscan.org/#/transaction/${txHash}`;
            default:
                return `https://etherscan.io/tx/${txHash}`;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">加载交易历史...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <p className="text-sm text-red-500">{error}</p>
                <Button onClick={fetchTransactions} size="sm" variant="outline" className="mt-4">
                    重试
                </Button>
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-sm text-gray-500">暂无交易记录</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">交易历史</h3>
                    <p className="text-sm text-gray-500">
                        {tokenSymbol} · {transactions.length} 笔交易
                    </p>
                </div>
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {/* Transaction List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {transactions.map((tx, index) => (
                    <div 
                        key={`${tx.txHash}-${index}`}
                        className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                {tx.direction === 'SEND' ? (
                                    <div className="p-1.5 bg-red-50 rounded-full">
                                        <ArrowUpRight className="w-4 h-4 text-red-500" />
                                    </div>
                                ) : tx.direction === 'RECEIVE' ? (
                                    <div className="p-1.5 bg-green-50 rounded-full">
                                        <ArrowDownLeft className="w-4 h-4 text-green-500" />
                                    </div>
                                ) : (
                                    <div className="p-1.5 bg-gray-50 rounded-full">
                                        <ExternalLink className="w-4 h-4 text-gray-500" />
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-900">
                                            {tx.direction === 'SEND' ? '发送' : tx.direction === 'RECEIVE' ? '接收' : '交易'}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                            tx.status === 1 
                                                ? 'bg-green-100 text-green-700' 
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                            {tx.status === 1 ? '成功' : '失败'}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        {formatDate(tx.blockTimestamp)}
                                    </div>
                                </div>
                            </div>
                            
                            <a
                                href={getExplorerUrl(tx.txHash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-600"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>

                        {/* Transaction Details */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <div className="text-gray-500 mb-1">从</div>
                                <div className="font-mono text-gray-900" title={tx.from}>
                                    {shortenAddress(tx.from)}
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500 mb-1">到</div>
                                <div className="font-mono text-gray-900" title={tx.to}>
                                    {shortenAddress(tx.to)}
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500 mb-1">金额</div>
                                <div className="font-semibold text-gray-900">
                                    {formatValue(tx.value, tx.decimal)} {tx.symbol}
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500 mb-1">手续费</div>
                                <div className="text-gray-900">
                                    {formatValue(tx.fee, chainType === 'BTC' ? 8 : 18)} {chainType === 'BTC' ? 'BTC' : chainType === 'TRON' ? 'TRX' : 'ETH'}
                                </div>
                            </div>
                        </div>

                        {/* TX Hash */}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="text-xs text-gray-500 mb-1">交易哈希</div>
                            <div className="font-mono text-xs text-gray-700 truncate" title={tx.txHash}>
                                {tx.txHash}
                            </div>
                        </div>

                        {/* Function Name (if available) */}
                        {tx.functionName && (
                            <div className="mt-2">
                                <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                                    {tx.functionName}
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

