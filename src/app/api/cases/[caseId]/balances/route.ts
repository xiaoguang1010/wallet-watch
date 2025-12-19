import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getBatchPortfolio } from '@/lib/balance-service';
import { db } from '@/data/db';
import { cases } from '@/data/schema/cases';
import { monitoredAddresses } from '@/data/schema/addresses';
import { eq } from 'drizzle-orm';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ caseId: string }> }
) {
    try {
        const { caseId } = await params;
        
        // 检查用户认证
        const cookieStore = await cookies();
        const userId = cookieStore.get("session_user_id")?.value;
        
        if (!userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Unauthorized',
                },
                { status: 401 }
            );
        }
        
        // 获取 case 数据
        const caseData = await db.query.cases.findFirst({
            where: eq(cases.id, caseId),
        });
        
        if (!caseData || caseData.userId !== userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Case not found',
                },
                { status: 404 }
            );
        }
        
        // 获取地址列表
        const addresses = await db.query.monitoredAddresses.findMany({
            where: eq(monitoredAddresses.caseId, caseId),
        });

        // 构建地址数组（支持多个地址）
        const addressArray = addresses.map((addr) => ({
            chain: addr.chain,
            address: addr.address,
        }));

        if (addressArray.length === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    chains: {},
                    totalValue: 0,
                    totalValueFormatted: '0.00',
                },
            });
        }

        // 获取余额数据（使用批量查询）
        const result = await getBatchPortfolio(addressArray);
        
        if (!result.success) {
            return NextResponse.json(result, { status: 500 });
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error in case balances API route:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to fetch case balances',
            },
            { status: 500 }
        );
    }
}

