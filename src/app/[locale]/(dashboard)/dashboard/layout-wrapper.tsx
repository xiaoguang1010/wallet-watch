'use client';

import { useState } from 'react';
import { LayoutClient } from './layout-client';
import type { FolderNode } from '@/modules/cases/cases.actions';

interface LayoutWrapperProps {
    folders: FolderNode[];
}

export function LayoutWrapper({ folders }: LayoutWrapperProps) {
    const [showCreateRoot, setShowCreateRoot] = useState(false);

    const handleAddGroup = () => {
        setShowCreateRoot(true);
    };

    const handleCancelCreateRoot = () => {
        setShowCreateRoot(false);
    };

    return (
        <div className="space-y-1">
            <LayoutClient 
                folders={folders}
                showCreateRoot={showCreateRoot}
                onCancelCreateRoot={handleCancelCreateRoot}
                onTriggerCreateRoot={handleAddGroup}
            />
        </div>
    );
}

