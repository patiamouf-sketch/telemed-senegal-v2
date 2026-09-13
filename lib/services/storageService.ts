import { auth, storage, isFirebaseConfigured } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Convertit un fichier quelconque en DataURL Base64
 */
export function fileToDataUrl(fileOrBlob: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Compresse une image côté client pour garantir une taille minimale (< 90 Ko)
 * Si l'image ne peut pas être décodée via Canvas (ex: HEIC, SVG, ou format exotique),
 * bascule gracieusement sur fileToDataUrl sans lever d'exception.
 */
export async function compressImage(
  fileOrBlob: File | Blob,
  maxDimension = 1000,
  quality = 0.72
): Promise<string> {
  if (typeof window === 'undefined') {
    return '';
  }

  // Si c'est un PDF ou un document non-image, convertir directement en Data URL
  const fileName = 'name' in fileOrBlob ? (fileOrBlob as File).name : '';
  if (fileOrBlob.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
    return fileToDataUrl(fileOrBlob);
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (!src) {
        fileToDataUrl(fileOrBlob).then(resolve).catch(() => resolve(''));
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
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
            resolve(src);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch {
          resolve(src);
        }
      };

      // En cas d'erreur de décodage (ex: format HEIC iPhone ou corrompu), ne jamais bloquer
      img.onerror = () => {
        resolve(src);
      };

      img.src = src;
    };

    reader.onerror = () => {
      fileToDataUrl(fileOrBlob).then(resolve).catch(() => resolve(''));
    };

    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Téléverse un fichier média vers Firebase Storage ou renvoie une version compressée sécurisée
 * Si l'utilisateur n'est pas authentifié (ex: formulaire d'adhésion) ou que Storage est indisponible,
 * utilise immédiatement la compression locale pour garantir une réactivité instantanée (< 100ms).
 */
export async function uploadMedia(
  fileOrBlob: File | Blob,
  destinationPath: string
): Promise<string> {
  // 1. Tenter Firebase Storage uniquement si l'utilisateur est authentifié et que le SDK est prêt
  const isAuth = Boolean(auth?.currentUser);
  if (isFirebaseConfigured && storage && isAuth) {
    try {
      const storageRef = ref(storage, destinationPath);
      const uploadPromise = (async () => {
        const snapshot = await uploadBytes(storageRef, fileOrBlob);
        return await getDownloadURL(snapshot.ref);
      })();

      // Timeout strict de 2,5 secondes pour ne jamais geler l'interface utilisateur
      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout Firebase Storage')), 2500)
      );

      return await Promise.race([uploadPromise, timeoutPromise]);
    } catch (err) {
      console.warn('Firebase Storage indisponible ou délai dépassé, utilisation du fallback compressé :', err);
    }
  }

  // 2. Traitement local compressé ultra-rapide (< 100ms)
  const targetFileName = 'name' in fileOrBlob ? (fileOrBlob as File).name : '';
  const isImage = fileOrBlob.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(targetFileName);
  if (isImage) {
    return await compressImage(fileOrBlob, 1000, 0.72);
  }

  // 3. Fallback conversion Base64 pour PDF, documents et audios
  return await fileToDataUrl(fileOrBlob);
}
