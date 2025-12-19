import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCaseAddressesRecursive } from '@/modules/cases/cases.actions';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ caseId: string }> }
) {
    try {
        const { caseId } = await params;

        const cookieStore = await cookies();
        const userId = cookieStore.get("session_user_id")?.value;

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const addresses = await getCaseAddressesRecursive(caseId);

        return NextResponse.json({
            success: true,
            data: addresses,
        });
    } catch (error: any) {
        console.error('Error in recursive addresses API route:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to fetch addresses',
            },
            { status: 500 }
        );
    }
}

