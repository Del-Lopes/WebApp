# Plan: Supabase Storage & Admin Monitoring

This plan outlines the steps to configure Supabase Storage for articles/analyses, implement a file upload system with folder organization, and add a storage monitoring dashboard to the admin panel.

## 1. Backend Configuration (Supabase)
- [x] **Create Storage Bucket**: Create a bucket named `content`.
- [x] **Setup Folders**: 
    - `/articles/` for blog posts.
    - `/analyses/` for technical analysis.
- [x] **RLS Policies**:
    - [x] `SELECT`: Public access (read).
    - [x] `INSERT/UPDATE/DELETE`: Restricted to `admin` and `first_mate` roles (checking `profiles` table).

## 2. Frontend Development
### 2.1. Logic & Utilities
- [x] Update `lib/supabase.ts` or create `lib/storage.ts`:
    - `uploadFile(file, category)`: Handles path generation (folder/filename) and upload.
    - `getStorageStats()`: Logic to estimate usage (Total of 1GB).
- [x] Modify `AdminPanel.tsx`:
    - Replace existing `handleUploadToSeaweed` with Supabase logic.
    - Implement folder-based naming: `${category}/${Date.now()}-${file.name}`.

### 2.2. UI Enhancements
- [x] **Storage Usage Indicator**:
    - [x] Create a stylized Progress Bar in the "Blog / Conteúdo" tab.
    - [x] Add tooltips or details showing exact usage (e.g., "120MB / 1024MB").
    - [x] Visual alerts: Yellow (80%), Red (95%).
- [x] **Blocking Logic**:
    - [x] Disable upload button if storage is full.
    - [x] Show a "Clear Space" hint if close to limit.

## 3. Aesthetics (Premium Design)
- [x] Use **Glassmorphism** for the status cards.
- [x] **Neon Accents**: Green for healthy, Orange/Red for critical usage.
- [x] **Micro-animations**: Pulse effect on the upload button when space is available, and "shaking" or dimmed effect when full.

## 4. Verification
- [ ] Test upload of images and documents.
- [ ] Check RLS policy enforcement with different user accounts.
- [ ] Verify the usage calculation logic.
