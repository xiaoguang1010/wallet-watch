import { getAllCasesAddresses } from '@/modules/cases/cases.actions';
import { CaseDashboardView } from '@/components/cases/case-dashboard-view';

export default async function DashboardPage() {
    // 获取所有分组的钱包地址信息
    const allCasesData = await getAllCasesAddresses();

    if (!allCasesData) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <p className="text-muted-foreground">无法加载数据</p>
            </div>
        );
    }

    return <CaseDashboardView data={allCasesData} />;
}
