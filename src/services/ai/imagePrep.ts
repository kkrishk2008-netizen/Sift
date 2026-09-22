import * as ImageManipulator from 'expo-image-manipulator';
import { IMAGE_QUALITY, MAX_IMAGE_WIDTH } from '../../constants/config';
import { ExtractionError } from '../../types';

export interface PreparedImage {
  base64: string;
  mime: 'image/jpeg';
}

/** Resize + JPEG-compress so uploads are small and the phone never holds a 12MP bitmap in memory. */
export async function prepareImage(uri: string, width?: number): Promise<PreparedImage> {
  const IM = ImageManipulator as unknown as {
    manipulateAsync?: (
      uri: string,
      actions: unknown[],
      opts: { compress: number; format: string; base64: boolean },
    ) => Promise<{ base64?: string }>;
    SaveFormat: { JPEG: string };
  };
  try {
    if (typeof IM.manipulateAsync !== 'function') throw new Error('manipulateAsync unavailable');
    const actions = width && width > MAX_IMAGE_WIDTH ? [{ resize: { width: MAX_IMAGE_WIDTH } }] : [];
    const out = await IM.manipulateAsync(uri, actions, {
      compress: IMAGE_QUALITY,
      format: IM.SaveFormat.JPEG,
      base64: true,
    });
    if (!out.base64) throw new Error('empty image');
    return { base64: out.base64, mime: 'image/jpeg' };
  } catch {
    throw new ExtractionError('invalid_image', 'Could not read that image');
  }
}
