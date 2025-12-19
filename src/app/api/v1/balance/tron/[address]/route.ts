import { NextRequest, NextResponse } from 'next/server';
import { getSingleChainBalance } from '@/lib/balance-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    
    if (!address) {
      return NextResponse.json(
        {
          success: false,
          error: 'Address is required',
        },
        { status: 400 }
      );
    }

    const result = await getSingleChainBalance(address, 'TRON');
    
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in TRON balance API route:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch TRON balance',
      },
      { status: 500 }
    );
  }
}

