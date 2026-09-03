import { db, isFirebaseConfigured } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
};

export interface WebRTCSessionCallbacks {
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onError?: (error: any) => void;
}

/**
 * Initialise une connexion WebRTC P2P pour une salle de consultation
 */
export class WebRTCManager {
  public peerConnection: RTCPeerConnection | null = null;
  public localStream: MediaStream | null = null;
  public remoteStream: MediaStream | null = null;
  private patientId: string;
  private isCaller: boolean; // true = Doctor (caller), false = Patient (callee)
  private callbacks: WebRTCSessionCallbacks;
  private unsubSignal: (() => void) | null = null;
  private pollInterval: any = null;
  private isCleanedUp = false;

  constructor(patientId: string, isCaller: boolean, callbacks: WebRTCSessionCallbacks) {
    this.patientId = patientId;
    this.isCaller = isCaller;
    this.callbacks = callbacks;
  }

  /**
   * Démarre la capture locale et initialise la connexion WebRTC
   */
  public async start(localStream: MediaStream): Promise<void> {
    this.localStream = localStream;
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);
    this.remoteStream = new MediaStream();

    // 1. Ajouter les pistes locales (Audio + Vidéo) à la connexion P2P
    this.localStream.getTracks().forEach(track => {
      if (this.peerConnection && this.localStream) {
        this.peerConnection.addTrack(track, this.localStream);
      }
    });

    // 2. Écouter les pistes distantes arrivant du pair
    this.peerConnection.ontrack = (event) => {
      const stream = this.remoteStream || new MediaStream();
      this.remoteStream = stream;

      event.streams[0].getTracks().forEach(track => {
        if (!stream.getTracks().some(t => t.id === track.id)) {
          stream.addTrack(track);
        }
      });
      this.callbacks.onRemoteStream(stream);
    };

    // 3. Changement d'état de la connexion
    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection && this.callbacks.onConnectionStateChange) {
        this.callbacks.onConnectionStateChange(this.peerConnection.connectionState);
      }
    };

    // 4. Échange des candidats ICE
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendIceCandidate(event.candidate);
      }
    };

    // 5. Initialiser la signalisation (Offer ou Answer)
    if (this.isCaller) {
      await this.initiateCall();
    } else {
      await this.listenForOffer();
    }
  }

  /**
   * Côté Médecin : Création et transmission de l'offre SDP
   */
  private async initiateCall(): Promise<void> {
    if (!this.peerConnection) return;

    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await this.peerConnection.setLocalDescription(offer);

      const signalData = {
        type: 'offer',
        sdp: offer.sdp,
        createdAt: new Date().toISOString(),
      };

      await this.sendSignal('offer', signalData);
      this.listenForAnswer();
    } catch (err) {
      if (this.callbacks.onError) this.callbacks.onError(err);
    }
  }

  /**
   * Côté Patient : Écoute de l'offre du médecin et réponse SDP
   */
  private async listenForOffer(): Promise<void> {
    this.subscribeToSignals(async (data) => {
      if (data.offer && !this.peerConnection?.currentRemoteDescription) {
        try {
          const offerDesc = new RTCSessionDescription({
            type: 'offer',
            sdp: data.offer.sdp,
          });
          await this.peerConnection?.setRemoteDescription(offerDesc);

          const answer = await this.peerConnection?.createAnswer();
          if (answer) {
            await this.peerConnection?.setLocalDescription(answer);
            await this.sendSignal('answer', {
              type: 'answer',
              sdp: answer.sdp,
              createdAt: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.warn('WebRTC offer handling error:', e);
        }
      }

      // Appliquer les candidats ICE du médecin
      if (data.doctorCandidates && Array.isArray(data.doctorCandidates)) {
        for (const candidateData of data.doctorCandidates) {
          try {
            await this.peerConnection?.addIceCandidate(new RTCIceCandidate(candidateData));
          } catch (e) {}
        }
      }
    });
  }

  /**
   * Côté Médecin : Écoute de la réponse SDP du patient
   */
  private listenForAnswer(): void {
    this.subscribeToSignals(async (data) => {
      if (data.answer && !this.peerConnection?.currentRemoteDescription) {
        try {
          const answerDesc = new RTCSessionDescription({
            type: 'answer',
            sdp: data.answer.sdp,
          });
          await this.peerConnection?.setRemoteDescription(answerDesc);
        } catch (e) {
          console.warn('WebRTC answer handling error:', e);
        }
      }

      // Appliquer les candidats ICE du patient
      if (data.patientCandidates && Array.isArray(data.patientCandidates)) {
        for (const candidateData of data.patientCandidates) {
          try {
            await this.peerConnection?.addIceCandidate(new RTCIceCandidate(candidateData));
          } catch (e) {}
        }
      }
    });
  }

  /**
   * Envoi d'un candidat ICE
   */
  private async sendIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    const candidatePayload = candidate.toJSON();
    const fieldName = this.isCaller ? 'doctorCandidates' : 'patientCandidates';

    if (isFirebaseConfigured && db) {
      try {
        const signalDocRef = doc(db, 'webrtc_sessions', this.patientId);
        await setDoc(
          signalDocRef,
          {
            [fieldName]: [candidatePayload],
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {}
    }

    // Fallback API
    if (typeof window !== 'undefined') {
      try {
        fetch('/api/consultation/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'webrtc_candidate',
            payload: {
              patientId: this.patientId,
              isCaller: this.isCaller,
              candidate: candidatePayload,
            },
          }),
        }).catch(() => {});
      } catch (e) {}
    }
  }

  /**
   * Enregistrement du signal SDP (Offer ou Answer)
   */
  private async sendSignal(type: 'offer' | 'answer', payload: any): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        const signalDocRef = doc(db, 'webrtc_sessions', this.patientId);
        await setDoc(
          signalDocRef,
          {
            [type]: payload,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {}
    }

    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/consultation/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'webrtc_signal',
            payload: {
              patientId: this.patientId,
              type,
              signal: payload,
            },
          }),
        });
      } catch (e) {}
    }
  }

  /**
   * Écouteur de signalisation (Firestore snapshot + polling API sync)
   */
  private subscribeToSignals(callback: (data: any) => void): void {
    if (isFirebaseConfigured && db) {
      try {
        const signalDocRef = doc(db, 'webrtc_sessions', this.patientId);
        this.unsubSignal = onSnapshot(signalDocRef, (snap) => {
          if (!this.isCleanedUp && snap.exists()) {
            callback(snap.data());
          }
        });
      } catch (e) {}
    }

    // Polling API Sync de secours toutes les 1.2 secondes
    this.pollInterval = setInterval(async () => {
      if (this.isCleanedUp) return;
      try {
        const res = await fetch(`/api/consultation/sync?type=webrtc&id=${encodeURIComponent(this.patientId)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.session && !this.isCleanedUp) {
            callback(json.session);
          }
        }
      } catch (e) {}
    }, 1200);
  }

  /**
   * Clôture propre de la connexion WebRTC
   */
  public destroy(): void {
    this.isCleanedUp = true;
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.unsubSignal) {
      try {
        this.unsubSignal();
      } catch (e) {}
    }

    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (e) {}
      this.peerConnection = null;
    }

    if (this.localStream) {
      try {
        this.localStream.getTracks().forEach(t => t.stop());
      } catch (e) {}
      this.localStream = null;
    }

    this.remoteStream = null;
  }
}
