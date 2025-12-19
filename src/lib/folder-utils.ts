import type { FolderNode } from '@/modules/cases/cases.actions';

/**
 * Recursively find a folder by ID in the folder tree
 * @param folders - Array of folder nodes to search
 * @param targetId - The ID of the folder to find
 * @returns The folder node if found, null otherwise
 */
export function findFolderById(
    folders: FolderNode[],
    targetId: string
): FolderNode | null {
    for (const folder of folders) {
        if (folder.id === targetId) {
            return folder;
        }
        const found = findFolderById(folder.children, targetId);
        if (found) {
            return found;
        }
    }
    return null;
}

