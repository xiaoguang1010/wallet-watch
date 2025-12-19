import { NextRequest, NextResponse } from 'next/server';
import { getBatchPortfolio } from '@/lib/balance-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { addresses } = body;

    const result = await getBatchPortfolio(addresses);
    
    if (!result.success) {
      const status = result.error?.includes('must be a non-empty array') ? 400 : 500;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in batch portfolio API route:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch batch portfolio',
      },
      { status: 500 }
    );
  }
}

