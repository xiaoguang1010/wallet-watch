'use client';

import { useState } from 'react';
import { FolderTree } from '@/components/cases/folder-tree';
import { AddAddressDialog } from '@/components/cases/add-address-dialog';
import { createCaseAction, updateCaseAction, deleteCaseAction } from '@/modules/cases/cases.actions';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';
import { findFolderById, isDescendantOf } from '@/lib/folder-utils';
import type { FolderNode } from '@/modules/cases/cases.actions';

interface LayoutClientProps {
    folders: FolderNode[];
    showCreateRoot: boolean;
    onCancelCreateRoot: () => void;
    onTriggerCreateRoot: () => void;
}

export function LayoutClient({ folders, showCreateRoot, onCancelCreateRoot, onTriggerCreateRoot }: LayoutClientProps) {
    const router = useRouter();
    const params = useParams();
    const currentCaseId = params.caseId as string | undefined;
    const locale = params.locale as string;
    const [addressDialogOpen, setAddressDialogOpen] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<{ id: string; name: string } | null>(null);

    const handleCreateFolder = async (parentId: string | null, name: string) => {
        try {
            const result = await createCaseAction({
                name,
                parentId: parentId,
                addresses: [], // Create folder without addresses
            });

            if (result.error || !result.success || !result.id) {
                toast.error(typeof result.error === 'string' ? result.error : "创建失败");
            } else {
                toast.success(`${parentId ? '子目录' : '分组'}创建成功`);
                
                // Hide the input box if it was a root folder creation
                if (!parentId) {
                    onCancelCreateRoot();
                }
                
                // 跳转到新建的分组详情页
                router.push(`/${locale}/dashboard/cases/${result.id}`);
                router.refresh();
            }
        } catch (error) {
            toast.error("创建失败");
        }
    };

    const handleAddAddresses = (folderId: string) => {
        const folder = findFolderById(folders, folderId);
        if (folder) {
            setSelectedFolder({ id: folder.id, name: folder.name });
            setAddressDialogOpen(true);
        }
    };

    const handleCloseAddressDialog = (open: boolean) => {
        setAddressDialogOpen(open);
        if (!open) {
            setSelectedFolder(null);
            router.refresh();
        }
    };

    const handleEditFolder = async (folderId: string, newName: string) => {
        try {
            const folder = findFolderById(folders, folderId);
            if (!folder) {
                toast.error("分组未找到");
                return;
            }

            const result = await updateCaseAction(folderId, {
                name: newName,
                description: '',
                parentId: folder.parentId,
                addresses: [], // Keep existing addresses (backend will handle)
            });

            if (result.error) {
                toast.error(typeof result.error === 'string' ? result.error : "更新失败");
            } else {
                toast.success("分组名称已更新");
                router.refresh();
            }
        } catch (error) {
            toast.error("更新失败");
        }
    };

    const handleDeleteFolder = async (folderId: string, folderName: string) => {
        // Find if this folder has children
        const folder = findFolderById(folders, folderId);
        const hasChildren = folder && folder.children.length > 0;
        
        const confirmMessage = hasChildren
            ? `确定要删除「${folderName}」吗？\n\n此操作将同时删除其下所有子分组及监控地址，且无法撤销。`
            : `确定要删除「${folderName}」吗？\n\n此操作将同时删除该分组下的所有监控地址，且无法撤销。`;
        
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            const result = await deleteCaseAction(folderId);
            
            if (result.error) {
                toast.error(typeof result.error === 'string' ? result.error : "删除失败");
            } else {
                toast.success("分组已删除");
                
                // 删除后统一跳转到概览页，避免404错误
                router.push(`/${locale}/dashboard`);
            }
        } catch (error) {
            toast.error("删除失败");
        }
    };

    return (
        <>
            <FolderTree 
                folders={folders} 
                onCreateSubfolder={handleCreateFolder}
                onAddAddresses={handleAddAddresses}
                onEditFolder={handleEditFolder}
                onDeleteFolder={handleDeleteFolder}
                showCreateRoot={showCreateRoot}
                onCancelCreateRoot={onCancelCreateRoot}
                onTriggerCreateRoot={onTriggerCreateRoot}
            />
            
            {/* Address dialog for level 3 folders */}
            {selectedFolder && (
                <AddAddressDialog
                    folderId={selectedFolder.id}
                    folderName={selectedFolder.name}
                    open={addressDialogOpen}
                    onOpenChange={handleCloseAddressDialog}
                />
            )}
        </>
    );
}

