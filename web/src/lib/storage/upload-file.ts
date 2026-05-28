import type { UploadConfig } from './types';

export async function uploadFile(file: File, config: UploadConfig): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', config.folder);

  if (config.provider === 'cloudinary') {
    fd.append('api_key', config.apiKey);
    fd.append('timestamp', String(config.timestamp));
    fd.append('signature', config.signature);
  }

  const res = await fetch(config.uploadUrl, { method: 'POST', body: fd });
  const data = (await res.json()) as { secure_url?: string; error?: { message: string } };

  if (data.error) throw new Error(data.error.message);
  return data.secure_url!;
}
