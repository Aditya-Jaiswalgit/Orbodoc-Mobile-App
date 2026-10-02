import { launchImageLibrary } from 'react-native-image-picker';
import { apiFetch, BASE_URL } from './apiConfig';

export function profilePhotoUrl(value: string): string {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return BASE_URL.replace(/\/api$/, '') + '/' + value.replace(/^[\\/]+/, '').replace(/\\/g, '/');
}

async function chooseAndUploadImage(isCurrent: () => boolean, kind: 'profile' | 'clinic'): Promise<string | null> {
  const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, assetRepresentationMode: 'compatible' });
  if (result.didCancel || !isCurrent()) return null;
  if (result.errorCode) throw new Error(result.errorMessage || 'Unable to open photo library.');
  const asset = result.assets?.[0];
  const allowedTypes = kind === 'profile' ? ['image/jpeg', 'image/png', 'image/webp'] : ['image/jpeg', 'image/png'];
  if (!asset?.uri || !asset.type || !allowedTypes.includes(asset.type)) {
    throw new Error(kind === 'profile' ? 'Choose a JPG, PNG or WEBP photo.' : 'Choose a JPG or PNG logo.');
  }
  if (asset.fileSize == null || asset.fileSize > 2 * 1024 * 1024) throw new Error('Photo must be 2MB or less.');
  const body = new FormData();
  body.append(kind === 'profile' ? 'pic' : 'logo', { uri: asset.uri, type: asset.type, name: asset.fileName || 'image.' + asset.type.split('/')[1] } as any);
  const response = await apiFetch<{ profile_photo_url?: string; logo_url?: string }>(
    kind === 'profile' ? '/staff/upload_profile' : '/clinics/upload_logo', { method: 'POST', body },
  );
  const url = kind === 'profile' ? response.data?.profile_photo_url : response.data?.logo_url;
  if (!response.success || !url) throw new Error(response.message || 'Image upload failed.');
  return url;
}

export const chooseAndUploadProfilePhoto = (isCurrent: () => boolean) => chooseAndUploadImage(isCurrent, 'profile');
export const chooseAndUploadClinicLogo = (isCurrent: () => boolean) => chooseAndUploadImage(isCurrent, 'clinic');
