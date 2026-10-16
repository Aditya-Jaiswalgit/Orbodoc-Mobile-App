import { NativeModules, Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';

/** Open an authenticated PDF in the device viewer, where the user can print or share it. */
export async function openPdfForPrinting(
  url: string,
  token: string,
  fileName: string,
) {
  if (!token) throw new Error('Please sign in again to open this PDF.');

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${safeName}`;
  const response = await ReactNativeBlobUtil.config({ path, fileCache: false })
    .fetch('GET', url, { Authorization: `Bearer ${token}` });
  const status = response.info().status;
  if (status < 200 || status >= 300) {
    throw new Error('Could not download the PDF for printing.');
  }

  if (Platform.OS === 'android') {
    await ReactNativeBlobUtil.android.actionViewIntent(
      response.path(),
      'application/pdf',
      'Open or print PDF',
    );
    return;
  }

  if (Platform.OS === 'ios') {
    await ReactNativeBlobUtil.ios.openDocument(response.path());
    return;
  }

  throw new Error('PDF printing is not supported on this device.');
}

/** Send generated report HTML to Android's native print dialog. */
export async function printHtmlDocument(html: string, jobName: string) {
  if (Platform.OS !== 'android' || !NativeModules.BillPdfDownload?.printHtml) {
    throw new Error('Printing is currently supported on Android.');
  }
  await NativeModules.BillPdfDownload.printHtml(html, jobName);
}
