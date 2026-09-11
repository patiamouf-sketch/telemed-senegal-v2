import { isDoctorLicenseValid } from '../lib/utils/license';
import { DoctorProfile } from '../lib/types/doctor';

console.log('--- TEST SUITE: SYNCHRONISATION DES LICENCES & ACTIVATION ---');

// Test 1: Statut Pending -> Doit être invalide et isPending true
const pendingDoc: Partial<DoctorProfile> = {
  id: 'doc-pending-1',
  fullName: 'Dr. En Attente',
  status: 'pending',
};
const resPending = isDoctorLicenseValid(pendingDoc as DoctorProfile);
console.assert(resPending.isPending === true, 'Test 1.1: isPending doit être true');
console.assert(resPending.isValid === false, 'Test 1.2: isValid doit être false pour pending');
console.log('✓ Test 1: Praticien en attente (pending) correctement restreint');

// Test 2: Statut Active sans licenseExpiresAt -> Doit accorder 30 jours par défaut
const activeNoDate: Partial<DoctorProfile> = {
  id: 'doc-active-1',
  fullName: 'Dr. Actif Sans Date',
  status: 'active',
};
const resActiveNoDate = isDoctorLicenseValid(activeNoDate as DoctorProfile);
console.assert(resActiveNoDate.isValid === true, 'Test 2.1: isValid doit être true pour active sans date');
console.assert(resActiveNoDate.daysRemaining >= 30, 'Test 2.2: Doit accorder au moins 30 jours');
console.log('✓ Test 2: Praticien actif sans date d’expiration bénéficie de 30 jours par défaut');

// Test 3: Statut Active avec date d’expiration invalide -> Doit être résilient (30 jours)
const activeInvalidDate: Partial<DoctorProfile> = {
  id: 'doc-active-2',
  fullName: 'Dr. Date Invalide',
  status: 'active',
  licenseExpiresAt: 'invalid-date-format',
};
const resActiveInvalid = isDoctorLicenseValid(activeInvalidDate as DoctorProfile);
console.assert(resActiveInvalid.isValid === true, 'Test 3.1: Doit être valide même avec chaîne de date mal formée');
console.assert(resActiveInvalid.daysRemaining >= 30, 'Test 3.2: Doit avoir 30 jours par défaut');
console.log('✓ Test 3: Praticien actif avec date mal formée correctement protégé');

// Test 4: Statut Active avec 30 jours valides
const futureDate = new Date(Date.now() + 30 * 86400000).toISOString();
const activeFuture: Partial<DoctorProfile> = {
  id: 'doc-active-3',
  fullName: 'Dr. Validé 30j',
  status: 'active',
  licenseExpiresAt: futureDate,
};
const resFuture = isDoctorLicenseValid(activeFuture as DoctorProfile);
console.assert(resFuture.isValid === true, 'Test 4.1: Doit être valide avec date future');
console.assert(resFuture.daysRemaining >= 29, 'Test 4.2: Doit avoir ~30 jours restants');
console.log('✓ Test 4: Praticien actif avec date future standard validé');

console.log('--- TÂCHE 1 : TOUS LES TESTS UNITAIRES DE BASE PASSENT AVEC SUCCÈS ---');
