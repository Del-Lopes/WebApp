
import { supabase } from './supabase';

export const BUCKET_NAME = 'content';
export const STORAGE_LIMIT_GB = 1;
export const STORAGE_LIMIT_BYTES = STORAGE_LIMIT_GB * 1024 * 1024 * 1024;

export interface StorageStats {
  usedBytes: number;
  totalBytes: number;
  percentage: number;
  isFull: boolean;
  isNearLimit: boolean;
}

/**
 * Gets storage usage stats for the content bucket
 */
export async function getStorageStats(): Promise<StorageStats> {
  try {
    const { data, error } = await supabase.rpc('get_storage_usage', {
      bucket_name: BUCKET_NAME
    });

    if (error) throw error;

    const usedBytes = Number(data || 0);
    const percentage = (usedBytes / STORAGE_LIMIT_BYTES) * 100;

    return {
      usedBytes,
      totalBytes: STORAGE_LIMIT_BYTES,
      percentage,
      isFull: usedBytes >= STORAGE_LIMIT_BYTES,
      isNearLimit: percentage >= 80
    };
  } catch (err) {
    console.error('Error fetching storage stats:', err);
    return {
      usedBytes: 0,
      totalBytes: STORAGE_LIMIT_BYTES,
      percentage: 0,
      isFull: false,
      isNearLimit: false
    };
  }
}

/**
 * Uploads a file to Supabase Storage organized by folder
 */
export async function uploadToSupabase(
  file: File, 
  category: 'articles' | 'analyses' | 'strategies' | 'other' = 'other'
): Promise<string> {
  // Check limit first
  const stats = await getStorageStats();
  if (stats.isFull) {
    throw new Error('Limite de armazenamento atingido (1GB). Por favor, limpe arquivos para continuar.');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
  const filePath = `${category}/${fileName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Formats bytes to a human readable format
 */
export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Deletes a file from Supabase Storage given its public URL
 */
export async function deleteFromSupabase(url: string): Promise<void> {
  try {
    // Extract path from public URL
    // Public URL format: https://.../storage/v1/object/public/content/category/filename
    const pathParts = url.split(`/public/${BUCKET_NAME}/`);
    if (pathParts.length < 2) return;
    
    const filePath = pathParts[1];
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) throw error;
  } catch (err) {
    console.error('Error deleting from storage:', err);
    throw err;
  }
}

export interface StorageFile {
    name: string;
    id: string;
    updated_at: string;
    created_at: string;
    last_accessed_at: string;
    metadata: any;
    url: string;
    path: string;
    size?: number;
}

/**
 * Lists all files in the storage bucket (recursive)
 */
export async function listAllFiles(path: string = ''): Promise<StorageFile[]> {
    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(path, {
            limit: 100,
            offset: 0,
            sortBy: { column: 'name', order: 'asc' }
        });

    if (error) throw error;

    let files: StorageFile[] = [];

    for (const item of data || []) {
        const itemPath = path ? `${path}/${item.name}` : item.name;
        
        // Supabase list returns objects without id for folders
        if (!item.id) {
            const folderFiles = await listAllFiles(itemPath);
            files = [...files, ...folderFiles];
        } else {
             const { data: { publicUrl } } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(itemPath);

            files.push({
                ...item,
                path: itemPath,
                url: publicUrl,
                size: item.metadata?.size
            } as any);
        }
    }

    return files.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
