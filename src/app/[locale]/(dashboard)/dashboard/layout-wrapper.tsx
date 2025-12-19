'use client';

import { useState, useEffect } from 'react';
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

    useEffect(() => {
        // 监听来自引导页的事件
        const handleTriggerCreate = () => {
            setShowCreateRoot(true);
        };

        window.addEventListener('trigger-create-root-folder', handleTriggerCreate);
        
        return () => {
            window.removeEventListener('trigger-create-root-folder', handleTriggerCreate);
        };
    }, []);

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

