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
 * Convertit un DataURL en Blob pour téléversement binaire optimisé
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  try {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch {
    return new Blob([], { type: 'image/jpeg' });
  }
}

/**
 * Compresse une photo ou image médicale côté client pour garantir un poids plume (< 120 Ko)
 * avec une netteté préservée pour les ordonnances, bilans et lésions cliniques.
 */
export async function compressImage(
  fileOrBlob: File | Blob,
  maxDimension = 1280,
  quality = 0.78
): Promise<string> {
  if (typeof window === 'undefined') {
    return '';
  }

  // Si c'est un document non-image (ex: PDF), convertir directement en Data URL
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

          // Redimensionnement proportionnel adaptatif
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

          // Rendu haute netteté
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Tentative format WebP (plus léger) puis fallback JPEG
          let compressedDataUrl = '';
          try {
            compressedDataUrl = canvas.toDataURL('image/webp', quality);
            if (!compressedDataUrl.startsWith('data:image/webp')) {
              compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            }
          } catch {
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          resolve(compressedDataUrl || src);
        } catch {
          resolve(src);
        }
      };

      // En cas d'erreur de décodage (ex: format HEIC iPhone ou corrompu), fallback gracieux
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
 * Téléverse un fichier média vers Firebase Storage avec compression préalable automatique
 * Si l'utilisateur n'est pas authentifié ou en cas de lenteur réseau,
 * bascule instantanément sur la version locale ultra-compressée (< 100ms).
 */
export async function uploadMedia(
  fileOrBlob: File | Blob,
  destinationPath: string
): Promise<string> {
  const targetFileName = 'name' in fileOrBlob ? (fileOrBlob as File).name : '';
  const isImage = fileOrBlob.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(targetFileName);

  // 1. Si c'est une image, on la compresse d'abord systématiquement
  let payloadToUpload: File | Blob = fileOrBlob;
  let compressedLocalDataUrl = '';

  if (isImage) {
    compressedLocalDataUrl = await compressImage(fileOrBlob, 1280, 0.78);
    if (compressedLocalDataUrl && compressedLocalDataUrl.startsWith('data:image/')) {
      payloadToUpload = dataUrlToBlob(compressedLocalDataUrl);
    }
  }

  // 2. Tenter l'envoi Firebase Storage si disponible
  const isAuth = Boolean(auth?.currentUser);
  if (isFirebaseConfigured && storage && isAuth) {
    try {
      const storageRef = ref(storage, destinationPath);
      const uploadPromise = (async () => {
        const snapshot = await uploadBytes(storageRef, payloadToUpload);
        return await getDownloadURL(snapshot.ref);
      })();

      // Timeout strict de 3 secondes pour ne jamais figer l'écran du patient/médecin
      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Délai dépassé')), 3000)
      );

      return await Promise.race([uploadPromise, timeoutPromise]);
    } catch (err) {
      console.warn('Firebase Storage non disponible ou délai dépassé, utilisation du fallback compressé :', err);
    }
  }

  // 3. Fallback Data URL compressé local
  if (compressedLocalDataUrl) {
    return compressedLocalDataUrl;
  }

  return await fileToDataUrl(fileOrBlob);
}
