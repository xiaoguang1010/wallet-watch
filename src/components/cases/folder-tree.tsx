'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InlineFolderInput } from './inline-folder-input';
import type { FolderNode } from '@/modules/cases/cases.actions';

interface FolderTreeProps {
    folders: FolderNode[];
    onCreateSubfolder?: (parentId: string | null, name: string) => void;
    onAddAddresses?: (folderId: string) => void;
    showCreateRoot?: boolean;
    onCancelCreateRoot?: () => void;
}

export function FolderTree({ folders, onCreateSubfolder, onAddAddresses, showCreateRoot, onCancelCreateRoot }: FolderTreeProps) {
    const handleCreateRoot = (name: string) => {
        onCreateSubfolder?.(null, name);
    };

    return (
        <div className="space-y-1">
            {showCreateRoot && (
                <InlineFolderInput
                    depth={0}
                    onSave={handleCreateRoot}
                    onCancel={onCancelCreateRoot || (() => {})}
                    placeholder="输入一级分组名称..."
                />
            )}
            {folders.map((folder) => (
                <FolderTreeNode
                    key={folder.id}
                    folder={folder}
                    onCreateSubfolder={onCreateSubfolder}
                    onAddAddresses={onAddAddresses}
                />
            ))}
        </div>
    );
}

interface FolderTreeNodeProps {
    folder: FolderNode;
    depth?: number;
    onCreateSubfolder?: (parentId: string | null, name: string) => void;
    onAddAddresses?: (folderId: string) => void;
}

function FolderTreeNode({ folder, depth = 0, onCreateSubfolder, onAddAddresses }: FolderTreeNodeProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [showInlineInput, setShowInlineInput] = useState(false);
    const params = useParams();
    const router = useRouter();
    const locale = params.locale as string;
    const currentCaseId = params.caseId as string | undefined;

    const hasChildren = folder.children.length > 0;
    const isActive = currentCaseId === folder.id;
    const canHaveChildren = folder.level < 3; // Only levels 1 and 2 can have children
    const isLevel3 = folder.level === 3; // Level 3 folders can only add addresses

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
        if (isLevel3) {
            // Level 3: open address dialog
            onAddAddresses?.(folder.id);
        } else {
            // Level 1 & 2: show inline input
            setShowInlineInput(true);
            setIsExpanded(true); // Auto expand when creating child
        }
    };

    const handleSaveInlineFolder = (name: string) => {
        onCreateSubfolder?.(folder.id, name);
        setShowInlineInput(false);
    };

    const handleCancelInlineFolder = () => {
        setShowInlineInput(false);
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

                {/* Add Button (subfolder for level 1&2, addresses for level 3) */}
                {isHovered && (onCreateSubfolder || onAddAddresses) && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={handleCreateSubfolder}
                        title={isLevel3 ? "添加监控地址" : "创建子目录"}
                    >
                        <Plus className="w-3 h-3" />
                    </Button>
                )}
            </div>

            {/* Children & Inline Input */}
            {isExpanded && (
                <div>
                    {/* Inline input for creating subfolder */}
                    {showInlineInput && (
                        <InlineFolderInput
                            depth={depth + 1}
                            onSave={handleSaveInlineFolder}
                            onCancel={handleCancelInlineFolder}
                            placeholder={`输入${folder.level === 1 ? '二' : '三'}级目录名称...`}
                        />
                    )}
                    
                    {/* Existing children */}
                    {hasChildren && folder.children.map((child) => (
                        <FolderTreeNode
                            key={child.id}
                            folder={child}
                            depth={depth + 1}
                            onCreateSubfolder={onCreateSubfolder}
                            onAddAddresses={onAddAddresses}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

