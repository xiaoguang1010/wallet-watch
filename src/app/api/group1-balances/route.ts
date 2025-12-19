import { NextResponse } from 'next/server';
import { getGroup1Balances } from '@/lib/balance-service';

export async function GET() {
  try {
    const result = await getGroup1Balances();
    
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in API route:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch balances',
      },
      { status: 500 }
    );
  }
}

