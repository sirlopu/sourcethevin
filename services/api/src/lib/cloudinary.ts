import { v2 as cloudinary } from 'cloudinary';

export interface SignedUploadParams {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  publicId: string;
  overwrite: true;
  signature: string;
  uploadUrl: string;
}

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary environment variables are not set');
  }
  return { cloudName, apiKey, apiSecret };
}

export function createSignedUpload(publicId: string): SignedUploadParams {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = { timestamp, public_id: publicId, overwrite: true };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return {
    cloudName,
    apiKey,
    timestamp,
    publicId,
    overwrite: true,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
  };
}

/** Namespaces every submission photo under sourcethevin/<referenceId>/<slot> in Cloudinary. */
export function buildSubmissionPhotoPublicId(referenceId: string, slot: string): string {
  return `sourcethevin/${referenceId}/${slot}`;
}

export function isValidCloudinaryUrl(url: string, cloudName: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'res.cloudinary.com' &&
      parsed.pathname.startsWith(`/${cloudName}/`)
    );
  } catch {
    return false;
  }
}
