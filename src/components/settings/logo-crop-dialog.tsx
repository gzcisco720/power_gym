'use client';

import { useState, useRef } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cropImageToBlob } from '@/lib/image/crop-image';

interface Props {
  open: boolean;
  imageSrc: string;
  onApply: (blob: Blob) => void;
  onCancel: () => void;
}

export function LogoCropDialog({ open, imageSrc, onApply, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [applying, setApplying] = useState(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  function handleCropComplete(_croppedArea: Area, pixelArea: Area) {
    setCroppedAreaPixels(pixelArea);
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, pixelArea.x, pixelArea.y, pixelArea.width, pixelArea.height, 0, 0, canvas.width, canvas.height);
    };
    img.src = imageSrc;
  }

  async function handleApply() {
    if (!croppedAreaPixels) return;
    setApplying(true);
    try {
      const blob = await cropImageToBlob(imageSrc, croppedAreaPixels);
      onApply(blob);
    } finally {
      setApplying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-foreground/[.06]">
          <DialogTitle>Crop Logo</DialogTitle>
        </DialogHeader>
        <div className="relative h-64 bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>
        <DialogFooter className="px-4 py-3 border-t border-foreground/[.06] flex items-center gap-3">
          <div className="flex items-center gap-2 mr-auto">
            <canvas
              ref={previewCanvasRef}
              width={40}
              height={40}
              className="rounded-full border border-foreground/10 bg-muted"
            />
            <span className="text-xs text-foreground/40">Preview</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="text-foreground/65"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={!croppedAreaPixels || applying}
            className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {applying ? 'Applying...' : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
