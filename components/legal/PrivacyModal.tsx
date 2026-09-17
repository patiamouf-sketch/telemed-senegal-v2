'use client';

import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import {
  ShieldCheck,
  Lock,
  FileText,
  Building2,
  Stethoscope,
  X,
  Printer,
  Scale,
  Server,
  Clock,
  UserCheck,
  HelpCircle,
  CheckCircle2,
  Mail,
  Phone
} from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export function PrivacyModal({ isOpen, onClose, onAccept }: PrivacyModalProps) {
  const [activeSection, setActiveSection] = useState<string>('all');

  if (!isOpen) return null;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* En-tête officiel */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">Politique de Confidentialité</h2>
              <p className="text-xs sm:text-sm text-emerald-200 flex items-center gap-1.5">
                <span>Protection des Données Personnelles de Santé</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-[11px] text-emerald-300">Conforme Loi CDP Sénégal n° 2008-12</span>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors border border-white/20 shadow-sm"
              title="Imprimer la politique"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimer</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              aria-label="Fermer la modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corps défilable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 text-slate-700 text-xs sm:text-sm leading-relaxed">
          
          {/* Bannière de Conformité Légale */}
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200/80 p-4 text-emerald-900 flex items-start gap-3">
            <Scale className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs uppercase tracking-wide">Cadre Légal & Réglementaire Sénégalais</p>
              <p className="text-xs text-emerald-800 mt-0.5">
                Le traitement de vos données personnelles et médicales sur <strong>TELEMED SENEGAL V2</strong> est strictement soumis aux dispositions de la <strong>Loi n° 2008-12 du 25 janvier 2008</strong> relative à la protection des données à caractère personnel et aux recommandations de la <strong>Commission de Protection des Données Personnelles (CDP)</strong> de la République du Sénégal.
              </p>
            </div>
          </div>

          {/* Article 1 : Responsable du Traitement */}
          <section className="space-y-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-1.5">
              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center">1</span>
              Responsable du Traitement & Délégué à la Protection des Données
            </h3>
            <p>
              Le responsable du traitement technique des données est <strong>Dr. Elhadji Pathé THIAM</strong> (THIAM GLOBAL BUSINESS / TELEMED SENEGAL V2), joignable par e-mail à <a href="mailto:pati.amouf@gmail.com" className="text-blue-600 underline">pati.amouf@gmail.com</a> ou par téléphone au <strong>+221 78 106 92 98</strong> (Dakar, Sénégal).
            </p>
            <p className="text-slate-500 text-xs">
              Chaque médecin conventionné inscrit sur la plateforme demeure juridiquement le <strong>Responsable du Traitement Médical</strong> de son patient au titre du secret professionnel et du Code de Déontologie de l&apos;Ordre National des Médecins du Sénégal (ONMS).
            </p>
          </section>

          {/* Article 2 : Données Collectées & Finalités */}
          <section className="space-y-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-1.5">
              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center">2</span>
              Catégories de Données Collectées & Finalités Légitimes
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li><strong>Données d&apos;identification :</strong> Nom, prénom, tranche d&apos;âge, sexe, numéro de téléphone, e-mail (nécessaires à la création du dossier et aux notifications de téléconsultation).</li>
              <li><strong>Données de santé sensibles :</strong> Motif de téléconsultation, symptômes, constantes, antécédents médicaux transmis volontairement par le patient pour la bonne exécution des soins.</li>
              <li><strong>Documents médicaux :</strong> Ordonnances numériques scellées par empreinte cryptographique SHA-256 et QR Code.</li>
              <li><strong>Données techniques de traçabilité :</strong> Horodatage des sessions, logs d&apos;accès sécurisés, jetons d&apos;autorisation WebRTC.</li>
            </ul>
          </section>

          {/* Article 3 : Sécurité & Hébergement Cloud Firebase */}
          <section className="space-y-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-1.5">
              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center">3</span>
              Sécurité, Chiffrement & Hébergement (Google Cloud / Firebase)
            </h3>
            <p>
              Les données sont hébergées au sein de l&apos;infrastructure sécurisée <strong>Google Cloud Platform / Firebase</strong>, certifiée conforme aux normes internationales de sécurité les plus exigeantes (<strong>ISO/IEC 27001</strong>, <strong>SOC 1/2/3</strong>, <strong>HIPAA compliance</strong>).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-blue-600" /> Chiffrement de Bout en Bout
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Communications chiffrées via TLS 1.3 (HTTPS/WSS) en transit et chiffrement systématique au repos (AES-256).
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-emerald-600" /> Firestore Security Rules
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Accès restreint par règles de sécurité logiques strictes. Aucun accès croisé non autorisé entre patients et praticiens.
                </p>
              </div>
            </div>
          </section>

          {/* Article 4 : Durée de Conservation (Tableau Officiel CDP) */}
          <section className="space-y-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-1.5">
              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center">4</span>
              Tableau des Durées de Conservation des Données
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Nature de la Donnée</th>
                    <th className="p-2.5">Durée de Conservation</th>
                    <th className="p-2.5">Justification Réglementaire</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-600">
                  <tr className="bg-white">
                    <td className="p-2.5 font-medium text-slate-800">Ordonnances & Actes Médicaux Scellés</td>
                    <td className="p-2.5 font-bold text-blue-600">10 ans</td>
                    <td className="p-2.5">Archivage médico-légal et responsabilité médicale.</td>
                  </tr>
                  <tr className="bg-slate-50/60">
                    <td className="p-2.5 font-medium text-slate-800">Comptes Utilisateurs Inactifs</td>
                    <td className="p-2.5 font-bold text-emerald-600">3 ans</td>
                    <td className="p-2.5">Suppression ou anonymisation après préavis par e-mail.</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-2.5 font-medium text-slate-800">Journaux d&apos;Audit & Logs d&apos;Accès</td>
                    <td className="p-2.5 font-bold text-indigo-600">1 an (12 mois)</td>
                    <td className="p-2.5">Traçabilité légale des accès aux données de santé.</td>
                  </tr>
                  <tr className="bg-slate-50/60">
                    <td className="p-2.5 font-medium text-slate-800">Messages Éphémères de Consultation (Chat/Audio)</td>
                    <td className="p-2.5 font-bold text-amber-600">Purge après consultation</td>
                    <td className="p-2.5">Minimisation des données temporaires de téléconsultation.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Article 5 : Vos Droits et Saisine de la CDP */}
          <section className="space-y-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-1.5">
              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center">5</span>
              Exercice de vos Droits (Loi 2008-12) & Réclamation CDP
            </h3>
            <p>
              Conformément aux articles 58 et suivants de la Loi n° 2008-12, vous disposez d&apos;un <strong>droit d&apos;accès</strong>, de <strong>rectification</strong>, de <strong>suppression</strong> (droit à l&apos;oubli dans le respect des obligations légales de conservation médicale), et d&apos;un <strong>droit d&apos;opposition</strong>.
            </p>
            <p>
              Pour exercer vos droits, vous pouvez nous adresser une demande accompagnée d&apos;un justificatif d&apos;identité par e-mail à : <strong className="text-slate-800">pati.amouf@gmail.com</strong>.
            </p>
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-950 mt-2">
              <strong>Saisine de l&apos;Autorité de Contrôle :</strong> En cas de difficulté non résolue, vous avez le droit d&apos;introduire une réclamation officielle auprès de la <strong>Commission de Protection des Données Personnelles du Sénégal (CDP)</strong> — Site web : <a href="https://www.cdp.sn" target="_blank" rel="noopener noreferrer" className="underline font-bold text-blue-700">www.cdp.sn</a> (VDN, Dakar).
            </div>
          </section>

        </div>

        {/* Pied de modal avec actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Document d&apos;information légale opposable • République du Sénégal</span>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {onAccept && (
              <GlassButton
                variant="primary"
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                className="w-full sm:w-auto text-xs py-2 px-4 shadow-sm bg-emerald-600 hover:bg-emerald-700"
              >
                J&apos;ai compris et j&apos;accepte
              </GlassButton>
            )}
            <GlassButton
              variant="secondary"
              onClick={onClose}
              className="w-full sm:w-auto text-xs py-2 px-4 shadow-sm"
            >
              Fermer
            </GlassButton>
          </div>
        </div>

      </div>
    </div>
  );
}
