import { getCaseDetails } from '@/modules/cases/cases.actions';
import { CaseDashboardView } from '@/components/cases/case-dashboard-view';
import { notFound } from 'next/navigation';

interface CasePageProps {
    params: Promise<{
        caseId: string;
    }>;
}

export default async function CasePage({ params }: CasePageProps) {
    const { caseId } = await params;

    // Fetch data server-side
    const caseData = await getCaseDetails(caseId);

    if (!caseData) {
        notFound();
    }

    return <CaseDashboardView data={caseData} />;
}
