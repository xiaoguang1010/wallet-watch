'use client';

import { CaseDashboardView } from '@/components/cases/case-dashboard-view';

// 模拟测试数据
const mockCaseData = {
    id: '1',
    name: '测试资产组',
    description: '这是一个测试资产组，用于展示新的 dashboard 样式',
    stats: {
        addressCount: 10,
        totalAssets: 12384560,
        assetDistribution: [
            { name: 'USDT', value: 74 },
            { name: 'BTC', value: 18 },
            { name: 'ETH', value: 8 },
        ],
    },
    addresses: [
        {
            id: '1',
            chain: 'BTC',
            network: 'Bitcoin',
            address: 'bc1qq2mvrp4g3ugd424dw4xv53rgsf8szkrv853jrc',
        },
        {
            id: '2',
            chain: 'ETH',
            network: 'Ethereum',
            address: '0x16ac14eF9d1834c31828f4958aa4a6693846C901',
        },
        {
            id: '3',
            chain: 'TRON',
            network: 'TRON',
            address: 'TH1tFgoYEsPtz11vEbbSfiERUiVrcNTS3v',
        },
    ],
};

export default function TestCaseDashboardPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <CaseDashboardView data={mockCaseData} />
        </div>
    );
}

