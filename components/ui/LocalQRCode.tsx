'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface LocalQRCodeProps {
  value: string;
  size?: number;
  avatarUrl?: string;
  className?: string;
}

/**
 * Générateur QR Code standard ISO avec intégration optionnelle de la photo de profil du praticien au centre
 */
export function LocalQRCode({ value, size = 120, avatarUrl, className = '' }: LocalQRCodeProps) {
  const [svgString, setSvgString] = useState<string>('');

  useEffect(() => {
    if (!value) return;

    // Utilisation de la correction d'erreur 'H' (High 30%) si un avatar est intégré
    QRCode.toString(value, {
      type: 'svg',
      width: size,
      margin: 1,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: avatarUrl ? 'H' : 'M',
    })
      .then(svg => {
        setSvgString(svg);
      })
      .catch(err => {
        console.warn('QR Code generation error:', err);
      });
  }, [value, size, avatarUrl]);

  if (!svgString) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`bg-slate-100 animate-pulse rounded-lg flex items-center justify-center ${className}`}
      >
        <span className="text-[10px] text-slate-400 font-mono">QR Code</span>
      </div>
    );
  }

  const avatarSize = Math.round(size * 0.24);

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center bg-white rounded-xl shadow-sm p-1 ${className}`}
    >
      <div
        className="w-full h-full flex items-center justify-center"
        dangerouslySetInnerHTML={{ __html: svgString }}
      />
      {avatarUrl && (
        <div
          style={{
            width: avatarSize,
            height: avatarSize,
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          className="rounded-full overflow-hidden border-2 border-white shadow-md bg-white flex items-center justify-center pointer-events-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt="Praticien"
            className="w-full h-full object-cover rounded-full"
          />
        </div>
      )}
    </div>
  );
}
