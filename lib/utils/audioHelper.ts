/**
 * Détecte dynamiquement le format audio compatible pour l'enregistrement MediaRecorder
 * Supporte nativement Android (WebM/Opus), iOS Safari (MP4/AAC), macOS et PC.
 */
export function getSupportedAudioMimeType(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return '';
  }

  const candidateTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];

  for (const type of candidateTypes) {
    try {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    } catch {
      // Ignorer les erreurs d'inspection d'API
    }
  }

  return '';
}
