import { initializeApp } from 'firebase/app';
import { initializeFirestore, getFirestore, collection, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAkZAm-7-R10BaYjJsjR5wg79If7gM1s2U',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'telemed-senegal-v2.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'telemed-senegal-v2',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'telemed-senegal-v2.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '484967187891',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:484967187891:web:ffa200e3fb240f1eb3b7c6',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ADMIN_EMAILS = ['pati.amouf@gmail.com', 'dr.thiam@telemed.sn'];
const ADMIN_DOCTOR_IDS = ['admin-thiam-1', 'dr-elhadji-pathe-thiam'];

async function runPurge() {
  console.log('🚀 Démarrage de la purge des données de test Firestore...');
  
  let deletedDocsCount = 0;
  let deletedQueuesCount = 0;
  let deletedPrescriptionsCount = 0;
  let deletedMedsCount = 0;
  let deletedRtcCount = 0;

  try {
    // 1. Purge des médecins de test (en préservant l'admin Dr. THIAM)
    console.log('📋 Nettoyage de la collection doctors...');
    const doctorsSnap = await getDocs(collection(db, 'doctors'));
    for (const d of doctorsSnap.docs) {
      const data = d.data();
      const email = (data.email || '').toLowerCase().trim();
      const id = d.id;
      const isOfficialAdmin = ADMIN_DOCTOR_IDS.includes(id) || ADMIN_EMAILS.includes(email) || data.role === 'admin';

      if (!isOfficialAdmin) {
        await deleteDoc(d.ref);
        console.log(`  🗑️ Médecin de test supprimé : ${d.id} (${data.fullName || 'Inconnu'})`);
        deletedDocsCount++;
      } else {
        console.log(`  🛡️ Compte Administrateur préservé : ${d.id} (${data.fullName})`);
      }
    }

    // 2. Purge de la file d'attente patient
    console.log('📋 Nettoyage de la collection patient_queues...');
    const queueSnap = await getDocs(collection(db, 'patient_queues'));
    for (const q of queueSnap.docs) {
      await deleteDoc(q.ref);
      deletedQueuesCount++;
    }

    // 3. Purge des ordonnances de test
    console.log('📋 Nettoyage de la collection prescriptions...');
    const prescSnap = await getDocs(collection(db, 'prescriptions'));
    for (const p of prescSnap.docs) {
      await deleteDoc(p.ref);
      deletedPrescriptionsCount++;
    }

    // 4. Purge des propositions de molécules et sessions WebRTC
    console.log('📋 Nettoyage des collections pending_meds et webrtc_sessions...');
    const medsSnap = await getDocs(collection(db, 'pending_meds'));
    for (const m of medsSnap.docs) {
      await deleteDoc(m.ref);
      deletedMedsCount++;
    }

    const rtcSnap = await getDocs(collection(db, 'webrtc_sessions'));
    for (const r of rtcSnap.docs) {
      await deleteDoc(r.ref);
      deletedRtcCount++;
    }

    // 5. Journal d'audit de la purge
    const auditId = `audit-purge-${Date.now()}`;
    await setDoc(doc(db, 'admin_audit_logs', auditId), {
      id: auditId,
      action: 'purge_test_data',
      adminEmail: 'dr.thiam@telemed.sn',
      adminName: 'Dr. Elhadji Pathé THIAM',
      targetId: 'system_purge',
      targetName: 'Purge globale des données de test',
      targetType: 'system',
      timestamp: new Date().toISOString(),
      details: `Purge système exécutée : ${deletedDocsCount} praticiens, ${deletedQueuesCount} files patient, ${deletedPrescriptionsCount} ordonnances, ${deletedMedsCount} molécules supprimées.`,
    });

    console.log('\n=============================================');
    console.log('✅ PURGE EFFECTUÉE AVEC SUCCÈS :');
    console.log(`- Praticiens de test supprimés : ${deletedDocsCount}`);
    console.log(`- Files d'attente supprimées : ${deletedQueuesCount}`);
    console.log(`- Ordonnances de test supprimées : ${deletedPrescriptionsCount}`);
    console.log(`- Molécules en attente supprimées : ${deletedMedsCount}`);
    console.log(`- Sessions WebRTC résiduelles supprimées : ${deletedRtcCount}`);
    console.log('=============================================\n');
  } catch (error) {
    console.error('❌ Erreur lors de la purge :', error);
  }
}

runPurge();
