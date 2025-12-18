'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { deleteCaseAction } from '@/modules/cases/cases.actions';
import { CaseDialog } from './case-dialog';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface CaseDashboardViewProps {
    data: any; // Type from getCaseDetails
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function CaseDashboardView({ data }: CaseDashboardViewProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    if (!data) return <div>Case not found</div>;

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this case? This action cannot be undone.")) return;

        setIsDeleting(true);
        try {
            const result = await deleteCaseAction(data.id);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Case deleted successfully");
                router.push('/dashboard');
            }
        } catch (error) {
            toast.error("Failed to delete case");
        } finally {
            setIsDeleting(false);
        }
    };

    const editData = {
        id: data.id,
        name: data.name,
        description: data.description || '',
        addresses: data.addresses.map((a: any) => ({
            address: a.address,
            chain: a.chain,
            network: a.network
        }))
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{data.name}</h1>
                    <p className="text-muted-foreground">{data.description}</p>
                </div>
                <div className="flex items-center gap-2">
                    <CaseDialog
                        mode="edit"
                        initialData={editData}
                        open={isEditOpen}
                        onOpenChange={setIsEditOpen}
                        trigger={
                            <Button variant="outline" size="sm" suppressHydrationWarning>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Case
                            </Button>
                        }
                    />

                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">总监控地址</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.addressCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">资产总估值 (USD)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${data.stats.totalAssets.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Asset Distribution Chart */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>资产分布</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.stats.assetDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.stats.assetDistribution.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Address List */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>监控地址列表</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Chain</TableHead>
                                    <TableHead>Network</TableHead>
                                    <TableHead>Address</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.addresses.map((addr: any) => (
                                    <TableRow key={addr.id}>
                                        <TableCell className="font-medium">{addr.chain}</TableCell>
                                        <TableCell>{addr.network}</TableCell>
                                        <TableCell className="font-mono text-xs">{addr.address}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
