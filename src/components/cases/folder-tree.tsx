'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FolderNode } from '@/modules/cases/cases.actions';

interface FolderTreeProps {
    folders: FolderNode[];
    onCreateSubfolder?: (parentId: string) => void;
}

export function FolderTree({ folders, onCreateSubfolder }: FolderTreeProps) {
    return (
        <div className="space-y-1">
            {folders.map((folder) => (
                <FolderTreeNode
                    key={folder.id}
                    folder={folder}
                    onCreateSubfolder={onCreateSubfolder}
                />
            ))}
        </div>
    );
}

interface FolderTreeNodeProps {
    folder: FolderNode;
    depth?: number;
    onCreateSubfolder?: (parentId: string) => void;
}

function FolderTreeNode({ folder, depth = 0, onCreateSubfolder }: FolderTreeNodeProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const params = useParams();
    const router = useRouter();
    const locale = params.locale as string;
    const currentCaseId = params.caseId as string | undefined;

    const hasChildren = folder.children.length > 0;
    const isActive = currentCaseId === folder.id;
    const canHaveChildren = folder.level < 3; // Only levels 1 and 2 can have children

    const handleClick = () => {
        router.push(`/${locale}/dashboard/cases/${folder.id}`);
    };

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasChildren) {
            setIsExpanded(!isExpanded);
        }
    };

    const handleCreateSubfolder = (e: React.MouseEvent) => {
        e.stopPropagation();
        onCreateSubfolder?.(folder.id);
    };

    return (
        <div>
            <div
                className={cn(
                    "group relative flex items-center gap-1 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors",
                    isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                onClick={handleClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Expand/Collapse Icon */}
                <button
                    onClick={handleToggle}
                    className={cn(
                        "flex items-center justify-center w-4 h-4 shrink-0",
                        !hasChildren && "invisible"
                    )}
                >
                    {hasChildren && (
                        isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                        ) : (
                            <ChevronRight className="w-4 h-4" />
                        )
                    )}
                </button>

                {/* Folder Icon */}
                <div className="flex items-center justify-center w-4 h-4 shrink-0">
                    {isExpanded && hasChildren ? (
                        <FolderOpen className="w-4 h-4" />
                    ) : (
                        <Folder className="w-4 h-4" />
                    )}
                </div>

                {/* Folder Name */}
                <span className="flex-1 truncate">{folder.name}</span>

                {/* Add Subfolder Button (only for level 1 and 2) */}
                {canHaveChildren && isHovered && onCreateSubfolder && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={handleCreateSubfolder}
                    >
                        <Plus className="w-3 h-3" />
                    </Button>
                )}
            </div>

            {/* Children */}
            {hasChildren && isExpanded && (
                <div>
                    {folder.children.map((child) => (
                        <FolderTreeNode
                            key={child.id}
                            folder={child}
                            depth={depth + 1}
                            onCreateSubfolder={onCreateSubfolder}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

