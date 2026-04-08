
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
  category: 'articles' | 'analyses' | 'other' = 'other'
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
