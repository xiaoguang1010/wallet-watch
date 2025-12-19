'use client';

import { useState } from 'react';
import { FolderTree } from '@/components/cases/folder-tree';
import { AddAddressDialog } from '@/components/cases/add-address-dialog';
import { createCaseAction } from '@/modules/cases/cases.actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { FolderNode } from '@/modules/cases/cases.actions';

interface LayoutClientProps {
    folders: FolderNode[];
    showCreateRoot: boolean;
    onCancelCreateRoot: () => void;
}

export function LayoutClient({ folders, showCreateRoot, onCancelCreateRoot }: LayoutClientProps) {
    const router = useRouter();
    const [addressDialogOpen, setAddressDialogOpen] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<{ id: string; name: string } | null>(null);

    const handleCreateFolder = async (parentId: string | null, name: string) => {
        try {
            const result = await createCaseAction({
                name,
                parentId: parentId,
                addresses: [], // Create folder without addresses
            });

            if (result.error) {
                toast.error(typeof result.error === 'string' ? result.error : "创建失败");
            } else {
                toast.success(`${parentId ? '子目录' : '分组'}创建成功`);
                router.refresh();
            }
        } catch (error) {
            toast.error("创建失败");
        }
    };

    const handleAddAddresses = (folderId: string) => {
        // Find folder name from tree
        const findFolder = (nodes: FolderNode[]): FolderNode | null => {
            for (const node of nodes) {
                if (node.id === folderId) return node;
                const found = findFolder(node.children);
                if (found) return found;
            }
            return null;
        };

        const folder = findFolder(folders);
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

    return (
        <>
            <FolderTree 
                folders={folders} 
                onCreateSubfolder={handleCreateFolder}
                onAddAddresses={handleAddAddresses}
                showCreateRoot={showCreateRoot}
                onCancelCreateRoot={onCancelCreateRoot}
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

