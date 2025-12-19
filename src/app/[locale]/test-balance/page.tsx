'use client';

import { WalletGroup1 } from "@/components/wallet-group1";

export default function TestBalancePage() {
    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">余额测试页面</h1>
                    <p className="text-muted-foreground">此页面用于测试钱包余额显示功能，无需登录</p>
                </div>
                <WalletGroup1 />
            </div>
        </div>
    );
}

