'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GlassButton } from './GlassButton';
import { RotateCw, Check, X, Crop, Move, Sparkles } from 'lucide-react';

interface ImageCropperModalProps {
  imageSrc: string;
  isOpen?: boolean;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
  title?: string;
  subtitle?: string;
}

export function ImageCropperModal({
  imageSrc,
  isOpen = true,
  onClose,
  onCropComplete,
  title = 'Recadrer le Cachet & la Signature',
  subtitle = 'Ajustez le cadre autour de votre tampon et signature pour éliminer les bords inutiles.',
}: ImageCropperModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // État de rotation de l'image (0, 90, 180, 270 deg)
  const [rotation, setRotation] = useState(0);

  // Zone de recadrage en pourcentage normalisé (0 à 100)
  const [cropBox, setCropBox] = useState({
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  });

  // Gestion du drag / resize
  const [dragMode, setDragMode] = useState<string | null>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    initialCrop: { x: number; y: number; width: number; height: number };
  }>({
    clientX: 0,
    clientY: 0,
    initialCrop: { x: 10, y: 10, width: 80, height: 80 },
  });

  // Réinitialiser la zone au chargement d'une nouvelle image
  useEffect(() => {
    if (isOpen) {
      setRotation(0);
      setCropBox({ x: 10, y: 10, width: 80, height: 80 });
    }
  }, [isOpen, imageSrc]);

  // Rotation 90° horaire
  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Début du drag / resize
  const handlePointerDown = (mode: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragMode(mode);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialCrop: { ...cropBox },
    };
  };

  // Mouvement du curseur / doigt
  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragMode || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const deltaXPct = ((e.clientX - dragStartRef.current.clientX) / rect.width) * 100;
      const deltaYPct = ((e.clientY - dragStartRef.current.clientY) / rect.height) * 100;
      const init = dragStartRef.current.initialCrop;

      let newCrop = { ...init };

      if (dragMode === 'move') {
        newCrop.x = Math.max(0, Math.min(100 - init.width, init.x + deltaXPct));
        newCrop.y = Math.max(0, Math.min(100 - init.height, init.y + deltaYPct));
      } else if (dragMode === 'se') {
        newCrop.width = Math.max(15, Math.min(100 - init.x, init.width + deltaXPct));
        newCrop.height = Math.max(15, Math.min(100 - init.y, init.height + deltaYPct));
      } else if (dragMode === 'nw') {
        const maxX = init.x + init.width - 15;
        const maxY = init.y + init.height - 15;
        newCrop.x = Math.max(0, Math.min(maxX, init.x + deltaXPct));
        newCrop.y = Math.max(0, Math.min(maxY, init.y + deltaYPct));
        newCrop.width = init.x + init.width - newCrop.x;
        newCrop.height = init.y + init.height - newCrop.y;
      } else if (dragMode === 'ne') {
        const maxY = init.y + init.height - 15;
        newCrop.y = Math.max(0, Math.min(maxY, init.y + deltaYPct));
        newCrop.width = Math.max(15, Math.min(100 - init.x, init.width + deltaXPct));
        newCrop.height = init.y + init.height - newCrop.y;
      } else if (dragMode === 'sw') {
        const maxX = init.x + init.width - 15;
        newCrop.x = Math.max(0, Math.min(maxX, init.x + deltaXPct));
        newCrop.width = init.x + init.width - newCrop.x;
        newCrop.height = Math.max(15, Math.min(100 - init.y, init.height + deltaYPct));
      }

      setCropBox(newCrop);
    },
    [dragMode]
  );

  const handlePointerUp = useCallback(() => {
    setDragMode(null);
  }, []);

  useEffect(() => {
    if (dragMode) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [dragMode, handlePointerMove, handlePointerUp]);

  // Validation et découpage de l'image
  const handleApplyCrop = () => {
    const img = imageRef.current;
    if (!img) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Appliquer d'abord la rotation sur un canvas temporaire si nécessaire
    const rotatedCanvas = document.createElement('canvas');
    const rotCtx = rotatedCanvas.getContext('2d');
    if (!rotCtx) return;

    if (rotation === 90 || rotation === 270) {
      rotatedCanvas.width = img.naturalHeight;
      rotatedCanvas.height = img.naturalWidth;
    } else {
      rotatedCanvas.width = img.naturalWidth;
      rotatedCanvas.height = img.naturalHeight;
    }

    rotCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
    rotCtx.rotate((rotation * Math.PI) / 180);
    rotCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    // 2. Découper la zone sélectionnée selon les pourcentages
    const cropX = (cropBox.x / 100) * rotatedCanvas.width;
    const cropY = (cropBox.y / 100) * rotatedCanvas.height;
    const cropW = (cropBox.width / 100) * rotatedCanvas.width;
    const cropH = (cropBox.height / 100) * rotatedCanvas.height;

    canvas.width = Math.max(1, cropW);
    canvas.height = Math.max(1, cropH);

    ctx.drawImage(
      rotatedCanvas,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH
    );

    const croppedDataUrl = canvas.toDataURL('image/png');
    onCropComplete(croppedDataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-[28px] border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">{title}</h3>
              <p className="text-[11px] text-slate-500">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Espace de Recadrage Interactif */}
        <div className="p-4 bg-slate-900/95 flex-1 flex items-center justify-center overflow-hidden select-none">
          <div
            ref={containerRef}
            className="relative max-w-full max-h-[50vh] flex items-center justify-center overflow-hidden touch-none"
            style={{ userSelect: 'none' }}
          >
            {/* Image source avec rotation */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="À recadrer"
              className="max-w-full max-h-[50vh] object-contain transition-transform duration-200 pointer-events-none"
              style={{ transform: `rotate(${rotation}deg)` }}
            />

            {/* Masque assombri et Cadre de sélection */}
            <div
              className="absolute border-2 border-blue-400 bg-blue-500/15 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] cursor-move transition-none"
              style={{
                left: `${cropBox.x}%`,
                top: `${cropBox.y}%`,
                width: `${cropBox.width}%`,
                height: `${cropBox.height}%`,
              }}
              onPointerDown={e => handlePointerDown('move', e)}
            >
              {/* Poignée Coin Supérieur Gauche (NW) */}
              <div
                className="absolute -top-2 -left-2 w-5 h-5 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize shadow-md"
                onPointerDown={e => handlePointerDown('nw', e)}
              />
              {/* Poignée Coin Supérieur Droit (NE) */}
              <div
                className="absolute -top-2 -right-2 w-5 h-5 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize shadow-md"
                onPointerDown={e => handlePointerDown('ne', e)}
              />
              {/* Poignée Coin Inférieur Gauche (SW) */}
              <div
                className="absolute -bottom-2 -left-2 w-5 h-5 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize shadow-md"
                onPointerDown={e => handlePointerDown('sw', e)}
              />
              {/* Poignée Coin Inférieur Droit (SE) */}
              <div
                className="absolute -bottom-2 -right-2 w-5 h-5 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize shadow-md"
                onPointerDown={e => handlePointerDown('se', e)}
              />

              {/* Indicateur de déplacement central */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                <Move className="w-6 h-6 text-white drop-shadow" />
              </div>
            </div>
          </div>
        </div>

        {/* Barre d'outils et Actions */}
        <div className="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Boutons d'ajustement */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleRotate}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Faire pivoter l'image de 90°"
            >
              <RotateCw className="w-3.5 h-3.5 text-blue-600" />
              <span>Pivoter (90°)</span>
            </button>

            <button
              type="button"
              onClick={() => setCropBox({ x: 5, y: 5, width: 90, height: 90 })}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
            >
              Tout sélectionner
            </button>
          </div>

          {/* Boutons d'action finale */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={handleApplyCrop}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Valider le recadrage</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
