import { NextRequest, NextResponse } from 'next/server';
import { getMultiChainPortfolio } from '@/lib/balance-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const btc = searchParams.get('btc') || undefined;
    const eth = searchParams.get('eth') || undefined;
    const tron = searchParams.get('tron') || undefined;

    const result = await getMultiChainPortfolio({ btc, eth, tron });
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in multi-chain portfolio API route:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch multi-chain portfolio',
      },
      { status: 500 }
    );
  }
}

