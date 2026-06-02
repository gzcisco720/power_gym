import * as ImagePicker from 'expo-image-picker';
import { getUploadSignature } from './api/equipment.api';

export async function pickAndUploadImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const config = await getUploadSignature();

  interface RNFile {
    uri: string;
    type: string;
    name: string;
  }
  const formData = new FormData();
  const rnFile: RNFile = { uri: asset.uri, type: 'image/jpeg', name: 'equipment.jpg' };
  formData.append('file', rnFile as RNFile & Blob);
  formData.append('folder', config.folder);

  if (config.provider === 'cloudinary') {
    formData.append('api_key', config.apiKey);
    formData.append('signature', config.signature);
    formData.append('timestamp', String(config.timestamp));
  }

  const response = await fetch(config.uploadUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error('Upload failed');

  if (config.provider === 'cloudinary') {
    const json = (await response.json()) as { secure_url: string };
    return json.secure_url;
  }

  const json = (await response.json()) as { url: string };
  return json.url;
}
