export type UploadConfig =
  | {
      provider: 'cloudinary';
      uploadUrl: string;
      apiKey: string;
      signature: string;
      timestamp: number;
      folder: string;
      cloudName: string;
    }
  | {
      provider: 'local';
      uploadUrl: string;
      folder: string;
    };
