import { NextRequest, NextResponse } from 'next/server';
import { getSingleChainBalance } from '@/lib/balance-service';
import BigNumber from 'bignumber.js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const startTime = Date.now();
  try {
    const { address } = await params;
    
    console.log('[TRON API] Request received for address:', address);
    
    if (!address) {
      return NextResponse.json(
        {
          success: false,
          error: 'Address is required',
        },
        { status: 400 }
      );
    }

    const result = await getSingleChainBalance(address, 'TRON', BigNumber);
    
    const duration = Date.now() - startTime;
    console.log(`[TRON API] Request completed in ${duration}ms, success: ${result.success}`);
    
    if (!result.success) {
      console.error('[TRON API] Error:', result.error);
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[TRON API] Error after ${duration}ms:`, error.message);
    console.error('[TRON API] Stack:', error.stack);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch TRON balance',
      },
      { status: 500 }
    );
  }
}

