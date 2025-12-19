'use client';

import { useState } from 'react';
import { FolderTree } from '@/components/cases/folder-tree';
import { CaseDialog } from '@/components/cases/case-dialog';
import type { FolderNode } from '@/modules/cases/cases.actions';

interface LayoutClientProps {
    folders: FolderNode[];
}

export function LayoutClient({ folders }: LayoutClientProps) {
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

    const handleCreateSubfolder = (parentId: string) => {
        setSelectedParentId(parentId);
        setCreateDialogOpen(true);
    };

    const handleDialogClose = (open: boolean) => {
        setCreateDialogOpen(open);
        if (!open) {
            setSelectedParentId(null);
        }
    };

    return (
        <>
            <FolderTree folders={folders} onCreateSubfolder={handleCreateSubfolder} />
            
            {/* Subfolder creation dialog */}
            {createDialogOpen && (
                <CaseDialog
                    mode="create"
                    open={createDialogOpen}
                    onOpenChange={handleDialogClose}
                    parentId={selectedParentId}
                    trigger={<></>}
                />
            )}
        </>
    );
}

