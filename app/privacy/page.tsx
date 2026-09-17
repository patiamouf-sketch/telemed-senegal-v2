'use client';

import React from 'react';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import {
  ShieldCheck,
  Scale,
  ArrowLeft,
  Printer,
  Stethoscope,
  Building2,
  Lock,
  FileText,
  Clock,
  Server,
  UserCheck,
  CheckCircle2,
  Mail,
  Phone,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

export default function PrivacyPage() {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-100 text-slate-800 antialiased selection:bg-emerald-100 selection:text-emerald-900 pb-20">
      
      {/* En-tête Navigation */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 no-print">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center space-x-2 text-sm font-semibold text-slate-700 hover:text-emerald-600 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Retour à l&apos;accueil</span>
          </Link>

          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 shadow-sm"
              title="Imprimer la politique officielle"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Imprimer</span>
            </button>
            <div className="flex items-center space-x-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold tracking-tight text-slate-900 text-sm hidden sm:inline">TELEMED SENEGAL</span>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu Principal */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        
        {/* Titre & Bannière */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-900 text-xs font-semibold mb-4 shadow-sm">
            <Scale className="w-3.5 h-3.5 text-emerald-600" />
            <span>Conformité Réglementaire — Loi n° 2008-12</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Politique de Confidentialité & Protection des Données
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-2xl mx-auto">
            Gouvernance des données de santé, sécurité d&apos;hébergement et droits des personnes sous le contrôle de la Commission de Protection des Données Personnelles (CDP).
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Dernière révision officielle : 17 Septembre 2026 • République du Sénégal
          </p>
        </div>

        {/* 🛡️ BANNIÈRE CDP DE RÉFÉRENCE */}
        <div className="mb-8 rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white p-5 sm:p-7 shadow-xl shadow-emerald-900/15 border border-emerald-700/30 relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
              <ShieldCheck className="w-7 h-7 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider">
                Engagement Solennel de Protection des Données Médicales
              </h2>
              <p className="text-emerald-100 text-xs sm:text-sm mt-1.5 leading-relaxed">
                La confidentialité de votre dossier médical est un droit inaliénable. TELEMED SENEGAL V2 applique les standards de cybersécurité et de cryptographie les plus avancés pour garantir que seules les personnes habilitées (vous-même et votre médecin traitant) aient accès à vos informations de santé.
              </p>
            </div>
          </div>
        </div>

        {/* Corps des 9 Articles Détaillés */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-200/50 border border-slate-200/80 space-y-8 text-slate-700 text-sm leading-relaxed">
          
          {/* Article 1 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center shrink-0">1</span>
              Article 1 : Responsable du Traitement & Cadre Légal Sénégalais
            </h2>
            <div className="space-y-2">
              <p>
                <strong>1.1 Éditeur & Opérateur Technique :</strong> La plateforme <strong>TELEMED SENEGAL V2</strong> est opérée par <strong>Dr. Elhadji Pathé THIAM</strong> (Directeur Général de THIAM GLOBAL BUSINESS, Pharmacien et Informaticien), domicilié à Dakar, Sénégal. Contact officiel : <a href="mailto:pati.amouf@gmail.com" className="text-emerald-700 font-semibold underline">pati.amouf@gmail.com</a> • Téléphone : <strong>+221 78 106 92 98</strong>.
              </p>
              <p>
                <strong>1.2 Responsabilité Médicale Décentralisée :</strong> Chaque médecin inscrit et validé sur la plateforme agit en qualité de <strong>Responsable du Traitement des Données Médicales</strong> pour les patients qu&apos;il prend en charge, dans le respect strict du secret médical et du Code de Déontologie Médicale sénégalais.
              </p>
            </div>
          </section>

          {/* Article 2 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center shrink-0">2</span>
              Article 2 : Catégories de Données Personnelles Traitées
            </h2>
            <div className="space-y-2">
              <p>Nous ne collectons que les données strictement indispensables à la réalisation de la téléconsultation :</p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600">
                <li><strong>Données d&apos;identification du patient :</strong> Nom, prénom, tranche d&apos;âge, sexe, numéro de téléphone mobile (pour le rappel et le suivi), adresse e-mail.</li>
                <li><strong>Données de santé sensibles :</strong> Motif de consultation, symptômes décrits, antécédents médicaux transmis, constantes déclarées, notes de consultation rédigées par le médecin.</li>
                <li><strong>Ordonnances électroniques scellées :</strong> Nom des médicaments prescrits, posologies, durées de traitement, identifiant unique de l&apos;ordonnance et empreinte cryptographique SHA-256.</li>
                <li><strong>Données des praticiens :</strong> Nom, spécialité, numéro d&apos;inscription à l&apos;Ordre National des Médecins du Sénégal (ONMS), adresse du cabinet, tarifs de consultation.</li>
                <li><strong>Métadonnées techniques :</strong> Horodatage des sessions, logs de connexion et jetons de signalisation temps réel WebRTC.</li>
              </ul>
            </div>
          </section>

          {/* Article 3 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center shrink-0">3</span>
              Article 3 : Finalités Légitimes des Traitements
            </h2>
            <p>Les données sont traitées pour les finalités exclusives suivantes :</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-emerald-600" /> Téléconsultation Médicale
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Mise en relation directe et sécurisée entre le patient et le médecin par flux vidéo/audio chiffré WebRTC et messagerie instantanée.
                </p>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" /> Ordonnances Infalsifiables
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Génération, signature numérique et vérification de la délivrance en pharmacie via QR Code officiel sans duplication possible.
                </p>
              </div>
            </div>
          </section>

          {/* Article 4 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center shrink-0">4</span>
              Article 4 : Sécurité Technique, Chiffrement & Hébergement Firebase
            </h2>
            <div className="space-y-2">
              <p>
                L&apos;infrastructure technique repose sur l&apos;environnement cloud sécurisé <strong>Google Cloud Platform / Firebase</strong>, certifié selon les normes internationales <strong>ISO/IEC 27001</strong>, <strong>SOC 1/2/3</strong> et répondant aux exigences les plus sévères de sécurité des données de santé.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
                <li><strong>Chiffrement en transit :</strong> Toutes les requêtes sont systématiquement protégées par le protocole HTTPS/TLS 1.3.</li>
                <li><strong>Chiffrement au repos :</strong> Les bases de données (Firestore) et fichiers stockés (Cloud Storage) sont chiffrés avec la technologie AES-256.</li>
                <li><strong>Contrôle d&apos;accès granulaire :</strong> Les <em>Firestore Security Rules</em> interdisent formellement à un médecin ou un tiers d&apos;accéder aux dossiers d&apos;autres praticiens.</li>
                <li><strong>Accord de Traitement (DPA) :</strong> Les transferts techniques sont encadrés par le <em>Data Processing Addendum</em> de Google Cloud conforme aux standards internationaux.</li>
              </ul>
            </div>
          </section>

          {/* Article 5 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center shrink-0">5</span>
              Article 5 : Durées de Conservation des Données (Tableau Officiel)
            </h2>
            <p>
              Conformément au principe de limitation de conservation fixé par la CDP, les durées de rétention sont strictement encadrées :
            </p>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 mt-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Catégorie de Données</th>
                    <th className="p-3">Durée de Conservation</th>
                    <th className="p-3">Base Légale / Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-600">
                  <tr className="bg-white">
                    <td className="p-3 font-semibold text-slate-900">Ordonnances Médicales Scellées</td>
                    <td className="p-3 font-bold text-emerald-600">10 ans</td>
                    <td className="p-3">Archivage médico-légal et responsabilité professionnelle médicale.</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-900">Comptes Utilisateurs Inactifs</td>
                    <td className="p-3 font-bold text-blue-600">3 ans</td>
                    <td className="p-3">Suppression après notification préalable si aucune connexion constatée.</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-3 font-semibold text-slate-900">Journaux d&apos;Audit & Logs d&apos;Accès</td>
                    <td className="p-3 font-bold text-indigo-600">1 an (12 mois)</td>
                    <td className="p-3">Obligation de traçabilité des accès aux dossiers de santé.</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-900">Flux WebRTC & Messages Éphémères de File</td>
                    <td className="p-3 font-bold text-amber-600">Purge post-consultation</td>
                    <td className="p-3">Minimisation des données temporaires de session.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Article 6 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center shrink-0">6</span>
              Article 6 : Destinataires des Données & Secret Professionnel
            </h2>
            <div className="space-y-2">
              <p>
                Les données médicales ne font l&apos;objet d&apos;aucune commercialisation, cession ou communication à des tiers publicitaires. Les seuls destinataires habilités sont :
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
                <li>Le <strong>Patient</strong> concerné (accès à son ordonnance et son récapitulatif).</li>
                <li>Le <strong>Médecin traitant</strong> désigné par le patient pour la consultation.</li>
                <li>Le <strong>Pharmacien d&apos;officine</strong> scannant le QR Code officiel de délivrance (accès limité aux médicaments prescrits).</li>
                <li>Les <strong>Autorités judiciaires ou sanitaires sénégalaises</strong> sur réquisition légale expresse.</li>
              </ul>
            </div>
          </section>

          {/* Article 7 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center shrink-0">7</span>
              Article 7 : Vos Droits selon la Loi n° 2008-12
            </h2>
            <p>
              Conformément à la législation sénégalaise, toute personne physique dispose des droits fondamentaux suivants sur ses données :
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="font-bold text-slate-800 text-xs">Droit d&apos;Accès & Rectification</p>
                <p className="text-[11px] text-slate-500 mt-1">Vous pouvez à tout moment demander une copie complète de vos données ou la correction d&apos;informations inexactes.</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="font-bold text-slate-800 text-xs">Droit à l&apos;Effacement & à l&apos;Oubli</p>
                <p className="text-[11px] text-slate-500 mt-1">Vous pouvez solliciter la suppression de votre compte (hors prescriptions soumises à archivage légal).</p>
              </div>
            </div>
          </section>

          {/* Article 8 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center shrink-0">8</span>
              Article 8 : Modalités d&apos;Exercice des Droits & Contact DPO
            </h2>
            <p>
              Pour exercer vos droits ou pour toute question relative à la protection de vos données, vous pouvez nous écrire directement :
            </p>
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-emerald-700" /> Par e-mail : <a href="mailto:pati.amouf@gmail.com" className="underline font-semibold">pati.amouf@gmail.com</a>
                </p>
                <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-emerald-700" /> Par téléphone : <strong>+221 78 106 92 98</strong>
                </p>
              </div>
              <span className="text-[11px] text-emerald-800 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 font-medium">
                Délai de réponse : sous 72h ouvrées
              </span>
            </div>
          </section>

          {/* Article 9 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center shrink-0">9</span>
              Article 9 : Droit de Réclamation auprès de la CDP Sénégal
            </h2>
            <p>
              Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés ou que le traitement de vos données n&apos;est pas conforme à la Loi n° 2008-12, vous avez le droit d&apos;adresser une réclamation officielle auprès de l&apos;autorité de régulation nationale :
            </p>
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-sm text-emerald-400">Commission de Protection des Données Personnelles (CDP)</p>
                <p className="text-xs text-slate-300 mt-0.5">Voie de Dégagement Nord (VDN), Dakar — République du Sénégal</p>
              </div>
              <a
                href="https://www.cdp.sn"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm shrink-0"
              >
                <span>Consulter cdp.sn</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </section>

        </div>

        {/* Pied de page du document */}
        <div className="mt-8 text-center text-xs text-slate-500 space-y-2">
          <p className="flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Document de politique officielle opposable — TELEMED SENEGAL V2</span>
          </p>
          <div className="pt-2 flex items-center justify-center gap-4 text-xs font-semibold text-emerald-700">
            <Link href="/cgu" className="hover:underline">
              Consulter les CGU & Consentement
            </Link>
            <span>•</span>
            <Link href="/" className="hover:underline">
              Retour à l&apos;application
            </Link>
          </div>
        </div>

      </main>

    </div>
  );
}
