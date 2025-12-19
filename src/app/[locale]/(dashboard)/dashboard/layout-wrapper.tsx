'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { LayoutClient } from './layout-client';
import type { FolderNode } from '@/modules/cases/cases.actions';

interface LayoutWrapperProps {
    folders: FolderNode[];
    addGroupText: string;
}

export function LayoutWrapper({ folders, addGroupText }: LayoutWrapperProps) {
    const [showCreateRoot, setShowCreateRoot] = useState(false);

    const handleClickAddGroup = () => {
        setShowCreateRoot(true);
    };

    const handleCancelCreateRoot = () => {
        setShowCreateRoot(false);
    };

    return (
        <>
            <Button 
                variant="ghost" 
                className="w-full justify-start gap-2"
                onClick={handleClickAddGroup}
                disabled={showCreateRoot}
            >
                <Plus className="w-4 h-4" />
                {addGroupText}
            </Button>

            <div className="space-y-1 mt-1">
                <LayoutClient 
                    folders={folders}
                    showCreateRoot={showCreateRoot}
                    onCancelCreateRoot={handleCancelCreateRoot}
                />
            </div>
        </>
    );
}

