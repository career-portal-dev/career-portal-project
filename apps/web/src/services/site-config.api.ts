import { apiRequest } from "@/lib/api/request";
import type { SiteConfig } from "@/lib/site-config";

const PUBLIC_BASE = "/api/site-config";
const ADMIN_BASE = "/api/admin/site-config";

async function request<T>(input: string, init?: RequestInit, authenticated = true): Promise<T> {
  return apiRequest<T>(input, { ...init, authenticated });
}

export function fetchSiteConfig(init?: RequestInit): Promise<SiteConfig> {
  return request<SiteConfig>(PUBLIC_BASE, init, false);
}

export function fetchAdminSiteConfig(): Promise<SiteConfig> {
  return request<SiteConfig>(ADMIN_BASE);
}

export function saveAdminSiteConfig(config: SiteConfig): Promise<SiteConfig> {
  return request<SiteConfig>(ADMIN_BASE, { method: "PUT", body: JSON.stringify(config) });
}

/** Upload group of the Images tab: each picker lists only its own group. */
export type SiteImageCategory = "hero" | "culture" | "logo" | "about" | "story" | "gallery";

/** Uploads a site image into a group and returns its /uploads/... URL. */
export async function uploadSiteImage(file: File, category: SiteImageCategory): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  const result = await request<{ url: string }>(`${ADMIN_BASE}/upload?category=${category}`, {
    method: "POST",
    body: form,
  });
  return result.url;
}

export type UploadedSiteImage = {
  name: string;
  url: string;
  category: SiteImageCategory;
  size: number;
  uploadedAt: string;
};

/** Images uploaded through the Images tab, newest first. */
export function fetchSiteImageUploads(): Promise<UploadedSiteImage[]> {
  return request<UploadedSiteImage[]>(`${ADMIN_BASE}/uploads`);
}

/** Deletes an uploaded image file; refused (IMAGE_IN_USE) while the saved config uses it. */
export async function deleteSiteImageUpload(name: string): Promise<void> {
  await request<{ name: string }>(`${ADMIN_BASE}/uploads/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export function resetAdminSiteConfig(): Promise<SiteConfig> {
  return request<SiteConfig>(`${ADMIN_BASE}/reset`, { method: "POST" });
}
