'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, MoreVertical, Edit2, Trash2, GripVertical } from 'lucide-react';
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
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    type DraggableAttributes,
} from '@dnd-kit/core';
import type { DraggableSyntheticListeners } from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';

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
    const [tree, setTree] = useState<FolderNode[]>(folders);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setTree(folders);
    }, [folders]);

    useEffect(() => {
        setMounted(true);
    }, []);

    // useSensors 本身是 Hook，不能包裹在 useMemo 中
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }) // 适中距离，兼顾防误触和易用性
    );

    // Helpers to find parentId
    const findParentId = useCallback((nodes: FolderNode[], id: string, parentId: string | null = null): string | null => {
        for (const node of nodes) {
            if (node.id === id) return parentId;
            const childResult = findParentId(node.children || [], id, node.id);
            if (childResult !== null) return childResult;
        }
        return null;
    }, []);

    // Reorder children for a given parent
    const reorderTree = useCallback((nodes: FolderNode[], parentId: string | null, orderedIds: string[]): FolderNode[] => {
        const clone = nodes.map(n => ({ ...n, children: n.children ? [...n.children] : [] }));
        const reorderList = (list: FolderNode[], ids: string[]) => {
            const map = new Map(list.map(item => [item.id, item]));
            return ids.map(id => map.get(id)!).filter(Boolean);
        };

        if (parentId === null) {
            return reorderList(clone, orderedIds);
        }

        const dfs = (list: FolderNode[]): FolderNode[] => {
            return list.map(node => {
                if (node.id === parentId) {
                    return {
                        ...node,
                        children: reorderList(node.children || [], orderedIds),
                    };
                }
                if (node.children && node.children.length > 0) {
                    return { ...node, children: dfs(node.children) };
                }
                return node;
            });
        };

        return dfs(clone);
    }, []);

    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id) return;

            const parentActive = findParentId(tree, String(active.id));
            const parentOver = findParentId(tree, String(over.id));
            // 仅当同一父节点（或同为根）才允许排序
            if (parentActive !== parentOver) return;

            // 获取同父节点的有序列表
            const getSiblings = (nodes: FolderNode[], pid: string | null): FolderNode[] => {
                if (pid === null) return nodes;
                const stack = [...nodes];
                while (stack.length) {
                    const n = stack.pop()!;
                    if (n.id === pid) return n.children || [];
                    if (n.children) stack.push(...n.children);
                }
                return [];
            };

            const siblings = getSiblings(tree, parentActive);
            const oldIndex = siblings.findIndex(n => n.id === active.id);
            const newIndex = siblings.findIndex(n => n.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const newOrderIds = arrayMove(siblings.map(n => n.id), oldIndex, newIndex);
            const prevTree = tree;
            const newTree = reorderTree(tree, parentActive, newOrderIds);
            setTree(newTree);

            // call reorder API
            try {
                const response = await fetch('/api/cases/reorder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        parentId: parentActive,
                        orderedIds: newOrderIds,
                    }),
                });
                
                if (!response.ok) {
                    throw new Error(`Reorder failed: ${response.statusText}`);
                }
            } catch (e) {
                console.error('Reorder failed', e);
                toast.error('排序失败，已恢复原顺序');
                setTree(prevTree); // rollback on failure
            }
        },
        [tree, findParentId, reorderTree]
    );
    
    const handleCreateRoot = (name: string) => {
        onCreateSubfolder?.(null, name);
    };

    // Render folder tree content
    const renderFolderTree = () => (
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
            {mounted ? (
                <SortableContext items={tree.map(f => f.id)}>
                    {tree.map((folder) => (
                        <SortableFolderNode
                            key={folder.id}
                            folder={folder}
                            depth={0}
                            onCreateSubfolder={onCreateSubfolder}
                            onAddAddresses={onAddAddresses}
                            onEditFolder={onEditFolder}
                            onDeleteFolder={onDeleteFolder}
                            onFolderClick={onFolderClick}
                            renderChildren={(children) => (
                                <SortableContext items={children.map(c => c.id)}>
                                    {children.map(child => (
                                        <SortableFolderNode
                                            key={child.id}
                                            folder={child}
                                            depth={1}
                                            onCreateSubfolder={onCreateSubfolder}
                                            onAddAddresses={onAddAddresses}
                                            onEditFolder={onEditFolder}
                                            onDeleteFolder={onDeleteFolder}
                                            onFolderClick={onFolderClick}
                                            renderChildren={() => null} // no third level
                                        />
                                    ))}
                                </SortableContext>
                            )}
                        />
                    ))}
                </SortableContext>
            ) : (
                // SSR fallback: render static folder nodes
                tree.map((folder) => (
                    <StaticFolderNode
                        key={folder.id}
                        folder={folder}
                        depth={0}
                        onCreateSubfolder={onCreateSubfolder}
                        onAddAddresses={onAddAddresses}
                        onEditFolder={onEditFolder}
                        onDeleteFolder={onDeleteFolder}
                        onFolderClick={onFolderClick}
                        renderChildren={(children) => (
                            <>
                                {children.map(child => (
                                    <StaticFolderNode
                                        key={child.id}
                                        folder={child}
                                        depth={1}
                                        onCreateSubfolder={onCreateSubfolder}
                                        onAddAddresses={onAddAddresses}
                                        onEditFolder={onEditFolder}
                                        onDeleteFolder={onDeleteFolder}
                                        onFolderClick={onFolderClick}
                                        renderChildren={() => null}
                                    />
                                ))}
                            </>
                        )}
                    />
                ))
            )}
        </div>
    );

    return mounted ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {renderFolderTree()}
        </DndContext>
    ) : (
        renderFolderTree()
    );
}

interface DragHandleProps {
    attributes: DraggableAttributes;
    listeners: DraggableSyntheticListeners;
}

interface FolderTreeNodeProps {
    folder: FolderNode;
    depth?: number;
    onCreateSubfolder?: (parentId: string | null, name: string) => void;
    onAddAddresses?: (folderId: string) => void;
    onEditFolder?: (folderId: string, currentName: string) => void;
    onDeleteFolder?: (folderId: string, folderName: string) => void;
    onFolderClick?: (caseId: string, folderName: string) => void;
    renderChildren?: (children: FolderNode[]) => React.ReactNode;
}

function SortableFolderNode(props: FolderTreeNodeProps) {
    const { folder } = props;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: folder.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };
    return (
        <div ref={setNodeRef} style={style}>
            <FolderTreeNode {...props} dragHandleProps={{ attributes, listeners }} />
        </div>
    );
}

function StaticFolderNode(props: FolderTreeNodeProps) {
    return (
        <div>
            <FolderTreeNode {...props} />
        </div>
    );
}

function FolderTreeNode({ folder, depth = 0, onCreateSubfolder, onAddAddresses, onEditFolder, onDeleteFolder, onFolderClick, renderChildren, dragHandleProps }: FolderTreeNodeProps & { dragHandleProps?: DragHandleProps }) {
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
                    {/* Drag handle to reduce 误触 - only show when draggable */}
                    {dragHandleProps ? (
                        <button
                            className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-grab"
                            style={{ touchAction: 'none' }} // 让指针事件优先给 dnd-kit
                            onClick={(e) => e.stopPropagation()}
                            {...dragHandleProps.attributes}
                            {...dragHandleProps.listeners}
                        >
                            <GripVertical className="w-3 h-3" />
                        </button>
                    ) : (
                        <div className="w-5 h-5" /> // Spacer for SSR
                    )}
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
                    {hasChildren && renderChildren ? renderChildren(folder.children) : null}
                </div>
            )}
        </div>
    );
}

