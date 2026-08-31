'use client';

import React from 'react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { Badge } from './Badge';
import { X, QrCode, Copy, Check, Download, ExternalLink, Stethoscope, ShieldCheck } from 'lucide-react';

interface QRCodeModalProps {
  doctorName: string;
  speciality: string;
  onmsNumber: string;
  slug: string;
  url: string;
  onClose: () => void;
}

export function QRCodeModal({
  doctorName,
  speciality,
  onmsNumber,
  slug,
  url,
  onClose
}: QRCodeModalProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // High quality QR code SVG pattern
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(url)}&color=0c4a6e&bgcolor=ffffff&qzone=2`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md">
      <GlassCard className="relative w-full max-w-md bg-white/95 backdrop-blur-2xl border-white/90 p-6 sm:p-8 text-center shadow-2xl space-y-5">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-[18px] bg-gradient-to-tr from-medical-600 to-sky-400 text-white shadow-lg shadow-sky-500/25 mb-1">
            <QrCode className="w-6 h-6" />
          </div>
          <Badge variant="sky" size="sm">
            Kit Salle d'Attente Physique
          </Badge>
          <h2 className="text-xl font-bold text-slate-900">QR Code Praticien</h2>
          <p className="text-xs text-slate-500">
            Affichez ce QR Code à l'accueil de votre cabinet ou sur vos ordonnances.
          </p>
        </div>

        {/* QR Code Container */}
        <div className="p-5 rounded-[24px] bg-gradient-to-b from-sky-50 to-white border border-sky-100/90 shadow-inner flex flex-col items-center justify-center">
          <div className="p-3 bg-white rounded-[20px] shadow-md border border-slate-100 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSvgUrl}
              alt={`QR Code pour ${doctorName}`}
              width={200}
              height={200}
              className="rounded-[12px]"
            />
          </div>

          <div className="text-center space-y-0.5">
            <strong className="text-sm font-bold text-slate-900 block">{doctorName}</strong>
            <span className="text-xs text-medical-700 font-semibold block">{speciality}</span>
            <span className="text-[11px] text-slate-400 font-mono">ONMS: {onmsNumber}</span>
          </div>
        </div>

        {/* URL Box */}
        <div className="flex items-center gap-2 p-2 rounded-[16px] bg-slate-50 border border-slate-200/60 text-xs font-mono text-slate-700 select-all truncate">
          <span className="truncate flex-1 text-left px-2">{url}</span>
          <GlassButton
            size="sm"
            variant={copied ? 'success' : 'primary'}
            onClick={handleCopy}
            className="flex-shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copié' : 'Copier'}</span>
          </GlassButton>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-center gap-3">
          <a
            href={qrSvgUrl}
            target="_blank"
            download={`qrcode-${slug}.png`}
            rel="noopener noreferrer"
            className="w-full"
          >
            <GlassButton variant="secondary" size="md" className="w-full text-xs">
              <Download className="w-4 h-4" />
              Télécharger l'image HD
            </GlassButton>
          </a>
        </div>
      </GlassCard>
    </div>
  );
}
