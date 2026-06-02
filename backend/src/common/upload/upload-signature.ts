import * as crypto from 'crypto';

export interface UploadSignatureArgs {
  secret: string;
  cloudName: string;
  apiKey: string;
  timestamp: number;
}

export interface UploadSignatureResult {
  signature: string;
  timestamp: number;
  folder: string;
  cloudName: string;
  apiKey: string;
}

export function buildUploadSignature(
  args: UploadSignatureArgs,
): UploadSignatureResult {
  const { secret, cloudName, apiKey, timestamp } = args;
  const folder = 'equipment';
  const paramStr = `folder=${folder}&timestamp=${timestamp}${secret}`;
  const signature = crypto.createHash('sha1').update(paramStr).digest('hex');
  return { signature, timestamp, folder, cloudName, apiKey };
}
