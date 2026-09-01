'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface LocalQRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * Générateur QR Code standard ISO scannable à 100% par tous les smartphones
 */
export function LocalQRCode({ value, size = 120, className = '' }: LocalQRCodeProps) {
  const [svgString, setSvgString] = useState<string>('');

  useEffect(() => {
    if (!value) return;

    QRCode.toString(value, {
      type: 'svg',
      width: size,
      margin: 1,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then(svg => {
        setSvgString(svg);
      })
      .catch(err => {
        console.warn('QR Code generation error:', err);
      });
  }, [value, size]);

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

  return (
    <div
      style={{ width: size, height: size }}
      className={`inline-flex items-center justify-center bg-white rounded-xl shadow-sm p-1 ${className}`}
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
  );
}
