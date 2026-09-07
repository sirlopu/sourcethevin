import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildSubmissionPhotoPublicId,
  createSignedUpload,
  isValidCloudinaryUrl,
} from './cloudinary';

beforeEach(() => {
  process.env.CLOUDINARY_CLOUD_NAME = 'demo-cloud';
  process.env.CLOUDINARY_API_KEY = 'test-key';
  process.env.CLOUDINARY_API_SECRET = 'test-secret';
});

describe('createSignedUpload', () => {
  it('produces a signature matching the Cloudinary signing algorithm', () => {
    const signed = createSignedUpload('submissions/abc123/front');

    const expectedSignature = createHash('sha1')
      .update(
        `overwrite=true&public_id=submissions/abc123/front&timestamp=${signed.timestamp}test-secret`,
      )
      .digest('hex');

    expect(signed.signature).toBe(expectedSignature);
    expect(signed.cloudName).toBe('demo-cloud');
    expect(signed.apiKey).toBe('test-key');
    expect(signed.uploadUrl).toBe('https://api.cloudinary.com/v1_1/demo-cloud/image/upload');
  });

  it('throws when Cloudinary env vars are missing', () => {
    delete process.env.CLOUDINARY_API_SECRET;
    expect(() => createSignedUpload('submissions/abc123/front')).toThrow(
      'Cloudinary environment variables are not set',
    );
  });
});

describe('isValidCloudinaryUrl', () => {
  it('accepts a well-formed secure_url for the configured cloud', () => {
    expect(
      isValidCloudinaryUrl(
        'https://res.cloudinary.com/demo-cloud/image/upload/v1/x.jpg',
        'demo-cloud',
      ),
    ).toBe(true);
  });

  it('rejects a URL for a different cloud name', () => {
    expect(
      isValidCloudinaryUrl(
        'https://res.cloudinary.com/someone-else/image/upload/v1/x.jpg',
        'demo-cloud',
      ),
    ).toBe(false);
  });

  it('rejects a non-Cloudinary host', () => {
    expect(isValidCloudinaryUrl('https://evil.example.com/x.jpg', 'demo-cloud')).toBe(false);
  });

  it('rejects a malformed URL instead of throwing', () => {
    expect(isValidCloudinaryUrl('not a url', 'demo-cloud')).toBe(false);
  });
});

describe('buildSubmissionPhotoPublicId', () => {
  it('namespaces the photo under sourcethevin/<referenceId>/<slot>', () => {
    expect(buildSubmissionPhotoPublicId('STV-2026-00001', 'front')).toBe(
      'sourcethevin/STV-2026-00001/front',
    );
  });

  it('produces distinct ids for different slots of the same trade', () => {
    const front = buildSubmissionPhotoPublicId('STV-2026-00001', 'front');
    const rear = buildSubmissionPhotoPublicId('STV-2026-00001', 'rear');
    expect(front).not.toBe(rear);
  });

  it('produces distinct ids for the same slot across different trades', () => {
    const first = buildSubmissionPhotoPublicId('STV-2026-00001', 'front');
    const second = buildSubmissionPhotoPublicId('STV-2026-00002', 'front');
    expect(first).not.toBe(second);
  });
});
