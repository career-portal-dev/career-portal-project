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

/** Uploads a site image (logo, hero, culture, slideshow) and returns its /uploads/... URL. */
export async function uploadSiteImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  const result = await request<{ url: string }>(`${ADMIN_BASE}/upload`, {
    method: "POST",
    body: form,
  });
  return result.url;
}

export function resetAdminSiteConfig(): Promise<SiteConfig> {
  return request<SiteConfig>(`${ADMIN_BASE}/reset`, { method: "POST" });
}
