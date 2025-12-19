'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { InlineFolderInput } from './inline-folder-input';
import type { FolderNode } from '@/modules/cases/cases.actions';

interface FolderTreeProps {
    folders: FolderNode[];
    onCreateSubfolder?: (parentId: string | null, name: string) => void;
    onAddAddresses?: (folderId: string) => void;
    onEditFolder?: (folderId: string, currentName: string) => void;
    onDeleteFolder?: (folderId: string, folderName: string) => void;
    showCreateRoot?: boolean;
    onCancelCreateRoot?: () => void;
    onTriggerCreateRoot?: () => void;
    onFolderClick?: (caseId: string, folderName: string) => void;
}

export function FolderTree({ 
    folders, 
    onCreateSubfolder, 
    onAddAddresses, 
    onEditFolder,
    onDeleteFolder,
    showCreateRoot, 
    onCancelCreateRoot,
    onTriggerCreateRoot,
    onFolderClick
}: FolderTreeProps) {
    const t = useTranslations('Dashboard');
    
    const handleCreateRoot = (name: string) => {
        onCreateSubfolder?.(null, name);
    };

    return (
        <div className="space-y-1">
            {/* Add Group Button - Always visible */}
            <Button 
                variant="ghost" 
                className="w-full justify-start gap-2" 
                suppressHydrationWarning
                onClick={onTriggerCreateRoot}
                disabled={showCreateRoot}
            >
                <Plus className="w-4 h-4" />
                {t('add_group')}
            </Button>
            
            {/* Inline Input for Root - Shows below button */}
            {showCreateRoot && (
                <InlineFolderInput
                    depth={0}
                    onSave={handleCreateRoot}
                    onCancel={onCancelCreateRoot || (() => {})}
                    placeholder="请输入分组名称"
                />
            )}
            
            {/* Folder Nodes */}
            {folders.map((folder) => (
                <FolderTreeNode
                    key={folder.id}
                    folder={folder}
                    onCreateSubfolder={onCreateSubfolder}
                    onAddAddresses={onAddAddresses}
                    onEditFolder={onEditFolder}
                    onDeleteFolder={onDeleteFolder}
                    onFolderClick={onFolderClick}
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
    onEditFolder?: (folderId: string, currentName: string) => void;
    onDeleteFolder?: (folderId: string, folderName: string) => void;
    onFolderClick?: (caseId: string, folderName: string) => void; // 新增
}

function FolderTreeNode({ folder, depth = 0, onCreateSubfolder, onAddAddresses, onEditFolder, onDeleteFolder, onFolderClick }: FolderTreeNodeProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [showInlineInput, setShowInlineInput] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const params = useParams();
    const router = useRouter();
    const t = useTranslations('Dashboard');
    const locale = params.locale as string;
    const currentCaseId = params.caseId as string | undefined;

    const hasChildren = folder.children.length > 0;
    const isActive = currentCaseId === folder.id;
    const canHaveChildren = folder.level < 2; // Only level 1 can have children (now max 2 levels)
    const isLevel2 = folder.level === 2; // Level 2 folders can only add addresses

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
        if (isLevel2) {
            // Level 2: open address dialog
            onAddAddresses?.(folder.id);
        } else {
            // Level 1: show inline input
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

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSaveEdit = (newName: string) => {
        onEditFolder?.(folder.id, newName);
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
    };

    const handleDelete = () => {
        onDeleteFolder?.(folder.id, folder.name);
    };

    return (
        <div>
            {isEditing ? (
                <InlineFolderInput
                    depth={depth}
                    initialValue={folder.name}
                    onSave={handleSaveEdit}
                    onCancel={handleCancelEdit}
                    placeholder="请输入分组名称"
                />
            ) : (
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

                    {/* Action Buttons - Show on hover */}
                    {isHovered && (
                        <div className="flex items-center gap-1">
                            {/* Add Button */}
                            {(onCreateSubfolder || onAddAddresses) && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCreateSubfolder(e);
                                    }}
                                    title={isLevel2 ? "添加监控地址" : "创建子目录"}
                                >
                                    <Plus className="w-3 h-3" />
                                </Button>
                            )}
                            
                            {/* Three-dot Menu */}
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <MoreVertical className="w-3 h-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent 
                                    align="end" 
                                    className="w-32"
                                    onCloseAutoFocus={(e) => e.preventDefault()}
                                >
                                    <DropdownMenuItem
                                        onSelect={(e) => {
                                            e.preventDefault();
                                            handleEdit();
                                        }}
                                    >
                                        <Edit2 className="mr-2 h-4 w-4" />
                                        <span>编辑</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onSelect={(e) => {
                                            e.preventDefault();
                                            handleDelete();
                                        }}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>删除</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                </div>
            )}

            {/* Children & Inline Input */}
            {isExpanded && (
                <div>
                    {/* Inline input for creating subfolder */}
                    {showInlineInput && (
                        <InlineFolderInput
                            depth={depth + 1}
                            onSave={handleSaveInlineFolder}
                            onCancel={handleCancelInlineFolder}
                            placeholder="请输入分组名称"
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
                            onEditFolder={onEditFolder}
                            onDeleteFolder={onDeleteFolder}
                            onFolderClick={onFolderClick}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

