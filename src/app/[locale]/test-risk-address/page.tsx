'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Loader2 } from "lucide-react";

export default function TestRiskAddressPage() {
    const [address, setAddress] = useState('');
    const [chain, setChain] = useState('ETH');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const testAddresses = {
        ETH: [
            '0x16ac14eF9d1834c31828f4958aa4a6693846C901',
            '0x0000000000000000000000000000000000000000', // 零地址，可能有风险
        ],
        BTC: [
            'bc1qq2mvrp4g3ugd424dw4xv53rgsf8szkrv853jrc',
        ],
        TRON: [
            'TH1tFgoYEsPtz11vEbbSfiERUiVrcNTS3v',
        ],
    };

    const handleTest = async () => {
        if (!address) {
            setError('请输入地址');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const chainLower = chain.toLowerCase();
            const response = await fetch(`/api/v1/balance/${chainLower}/${encodeURIComponent(address)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            setResult(data);
        } catch (err: any) {
            setError(err.message || '测试失败');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickTest = (testAddr: string) => {
        setAddress(testAddr);
    };

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">风险地址测试工具</h1>
                    <p className="text-muted-foreground">测试余额 API 返回的风险字段信息</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>测试地址</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <select
                                value={chain}
                                onChange={(e) => setChain(e.target.value)}
                                className="px-3 py-2 border rounded-md"
                            >
                                <option value="ETH">ETH</option>
                                <option value="BTC">BTC</option>
                                <option value="TRON">TRON</option>
                            </select>
                            <Input
                                placeholder="输入地址"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="flex-1"
                            />
                            <Button onClick={handleTest} disabled={loading}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '测试'}
                            </Button>
                        </div>

                        {/* 快速测试地址 */}
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">快速测试地址：</p>
                            <div className="flex flex-wrap gap-2">
                                {testAddresses[chain as keyof typeof testAddresses]?.map((addr) => (
                                    <Button
                                        key={addr}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleQuickTest(addr)}
                                    >
                                        {addr.slice(0, 10)}...
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 结果显示 */}
                {error && (
                    <Card className="border-destructive">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-destructive">
                                <AlertTriangle className="w-5 h-5" />
                                <p>{error}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {result && (
                    <Card>
                        <CardHeader>
                            <CardTitle>API 响应结果</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {/* 成功状态 */}
                                <div>
                                    <p className="text-sm font-medium mb-2">状态：</p>
                                    <p className={result.success ? 'text-green-600' : 'text-red-600'}>
                                        {result.success ? '✅ 成功' : '❌ 失败'}
                                    </p>
                                </div>

                                {/* 风险信息 */}
                                {result.success && result.data && (
                                    <div>
                                        <p className="text-sm font-medium mb-2">风险信息：</p>
                                        <div className="bg-muted p-4 rounded-lg">
                                            <pre className="text-xs overflow-auto">
                                                {JSON.stringify(
                                                    {
                                                        riskLevel: (result.data as any).riskLevel,
                                                        risk: (result.data as any).risk,
                                                        // 检查所有可能的字段
                                                        allFields: Object.keys(result.data),
                                                    },
                                                    null,
                                                    2
                                                )}
                                            </pre>
                                        </div>
                                    </div>
                                )}

                                {/* 完整响应 */}
                                <div>
                                    <p className="text-sm font-medium mb-2">完整响应：</p>
                                    <div className="bg-muted p-4 rounded-lg max-h-96 overflow-auto">
                                        <pre className="text-xs">
                                            {JSON.stringify(result, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* 使用说明 */}
                <Card>
                    <CardHeader>
                        <CardTitle>使用说明</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <p>1. 选择链类型（ETH/BTC/TRON）</p>
                        <p>2. 输入要测试的地址（或使用快速测试地址）</p>
                        <p>3. 点击"测试"按钮</p>
                        <p>4. 查看 API 返回的数据结构，特别是风险相关字段</p>
                        <p className="mt-4 font-medium text-foreground">
                            如果 API 返回的数据中包含风险字段，请提供字段名称和格式，以便调整代码。
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

