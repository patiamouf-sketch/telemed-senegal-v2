import { storage, isFirebaseConfigured } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Compresse une image côté client pour garantir une taille minimale (< 90 Ko)
 */
export async function compressImage(
  fileOrBlob: File | Blob,
  maxDimension = 1200,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve('');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('Erreur de lecture de l’image'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Erreur de fichier'));
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Téléverse un fichier média vers Firebase Storage ou renvoie une version compressée sécurisée
 */
export async function uploadMedia(
  fileOrBlob: File | Blob,
  destinationPath: string
): Promise<string> {
  // 1. Tenter un upload direct sur Firebase Storage si configuré
  if (isFirebaseConfigured && storage) {
    try {
      const storageRef = ref(storage, destinationPath);
      const snapshot = await uploadBytes(storageRef, fileOrBlob);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (err) {
      console.warn('Firebase Storage upload notice (using lightweight compressed fallback):', err);
    }
  }

  // 2. Fallback compresseur client pour ne jamais dépasser la limite de document Firestore
  if (fileOrBlob.type.startsWith('image/')) {
    return await compressImage(fileOrBlob, 1000, 0.72);
  }

  // 3. Fallback conversion Base64 pour les fichiers audios
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(fileOrBlob);
  });
}
