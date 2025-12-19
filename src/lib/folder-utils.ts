import type { FolderNode } from '@/modules/cases/cases.actions';

/**
 * Find a folder by ID in a nested folder tree
 */
export function findFolderById(folders: FolderNode[], folderId: string): FolderNode | null {
    for (const folder of folders) {
        if (folder.id === folderId) {
            return folder;
        }
        if (folder.children.length > 0) {
            const found = findFolderById(folder.children, folderId);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Check if a folder is a descendant of another folder
 */
export function isDescendantOf(folders: FolderNode[], descendantId: string, ancestorId: string): boolean {
    const ancestor = findFolderById(folders, ancestorId);
    if (!ancestor) return false;
    
    // Check if descendantId exists in the ancestor's subtree
    return findFolderById([ancestor], descendantId) !== null;
}
