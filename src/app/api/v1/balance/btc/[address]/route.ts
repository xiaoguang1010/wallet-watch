import { NextRequest, NextResponse } from 'next/server';
import { getSingleChainBalance } from '@/lib/balance-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const startTime = Date.now();
  try {
    const { address } = await params;
    
    console.log('[BTC API] Request received for address:', address);
    
    if (!address) {
      return NextResponse.json(
        {
          success: false,
          error: 'Address is required',
        },
        { status: 400 }
      );
    }

    const result = await getSingleChainBalance(address, 'BTC');
    
    const duration = Date.now() - startTime;
    console.log(`[BTC API] Request completed in ${duration}ms, success: ${result.success}`);
    
    if (!result.success) {
      console.error('[BTC API] Error:', result.error);
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[BTC API] Error after ${duration}ms:`, error.message);
    console.error('[BTC API] Stack:', error.stack);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch BTC balance',
      },
      { status: 500 }
    );
  }
}

