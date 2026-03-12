import {
  ArrowCounterClockwiseIcon,
  CheckIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { FC } from "react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Cropper,
  CropperArea,
  type CropperAreaData,
  CropperImage,
  type CropperShape,
} from "@/components/ui/cropper";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

async function getCroppedFile(
  imageUrl: string,
  pixelCrop: CropperAreaData,
  rotation: number,
  fileName: string,
  fileType: string,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const ctx2d = (canvas: HTMLCanvasElement) => canvas.getContext("2d");

      const rotRad = (rotation * Math.PI) / 180;
      const bBoxWidth =
        Math.abs(Math.cos(rotRad) * image.naturalWidth) +
        Math.abs(Math.sin(rotRad) * image.naturalHeight);
      const bBoxHeight =
        Math.abs(Math.sin(rotRad) * image.naturalWidth) +
        Math.abs(Math.cos(rotRad) * image.naturalHeight);

      const rotCanvas = document.createElement("canvas");
      rotCanvas.width = bBoxWidth;
      rotCanvas.height = bBoxHeight;
      const rotCtx = ctx2d(rotCanvas);
      if (!rotCtx) return reject(new Error("No canvas context"));

      rotCtx.translate(bBoxWidth / 2, bBoxHeight / 2);
      rotCtx.rotate(rotRad);
      rotCtx.drawImage(
        image,
        -image.naturalWidth / 2,
        -image.naturalHeight / 2,
      );

      const canvas = document.createElement("canvas");
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = ctx2d(canvas);
      if (!ctx) return reject(new Error("No canvas context"));

      ctx.drawImage(
        rotCanvas,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height,
      );

      const outputType = fileType === "image/gif" ? "image/jpeg" : fileType;
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(new File([blob], fileName, { type: outputType }));
          else reject(new Error("Failed to create blob"));
        },
        outputType,
        0.92,
      );
    };
    image.onerror = reject;
    image.src = imageUrl;
  });
}

interface ImageCropDialogProps {
  /** The raw file to crop. Dialog is open when this is not null. */
  file: File | null;
  /** Called with the cropped File when the user confirms. */
  onConfirm: (croppedFile: File) => void;
  /** Called when the user cancels or closes the dialog. */
  onCancel: () => void;
  /** Aspect ratio of the crop area. Defaults to 1 (square). */
  aspectRatio?: number;
  /** Shape of the crop overlay. Defaults to "rectangle". */
  shape?: CropperShape;
}

export const ImageCropDialog: FC<ImageCropDialogProps> = ({
  file,
  onConfirm,
  onCancel,
  aspectRatio = 1,
  shape = "rectangle",
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] =
    useState<CropperAreaData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const open = file !== null;

  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleCropComplete = useCallback(
    (_croppedArea: CropperAreaData, pixels: CropperAreaData) => {
      setCroppedAreaPixels(pixels);
    },
    [],
  );

  const handleReset = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!imageUrl || !croppedAreaPixels || !file) return;

    setIsProcessing(true);
    try {
      const croppedFile = await getCroppedFile(
        imageUrl,
        croppedAreaPixels,
        rotation,
        file.name,
        file.type || "image/jpeg",
      );
      onConfirm(croppedFile);
    } catch {
      // silently ignore - caller will handle via mutation error
    } finally {
      setIsProcessing(false);
    }
  }, [imageUrl, croppedAreaPixels, rotation, file, onConfirm]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent showCloseButton={false} className="gap-4 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Recortar imagen</DialogTitle>
        </DialogHeader>

        {/* Crop area */}
        <div className="relative h-96 w-full overflow-hidden rounded-lg bg-muted">
          {imageUrl && (
            <Cropper
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspectRatio={aspectRatio}
              minZoom={1}
              maxZoom={5}
              objectFit="contain"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={handleCropComplete}
            >
              <CropperImage src={imageUrl} alt="Imagen a recortar" />
              <CropperArea shape={shape} withGrid />
            </Cropper>
          )}
        </div>

        <p className="text-center text-muted-foreground text-xs">
          Arrastra para mover · Rueda del ratón o pellizco para hacer zoom
        </p>

        <DialogFooter className="grid grid-cols-1 gap-2 md:gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isProcessing}
            className="w-full"
          >
            <ArrowCounterClockwiseIcon />
            Restablecer
          </Button>

          <section className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:gap-4">
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isProcessing || !croppedAreaPixels}
              className="w-full"
            >
              <CheckIcon />
              {isProcessing ? "Procesando..." : "Confirmar"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onCancel}
              disabled={isProcessing}
              className="w-full"
            >
              <XIcon />
              Cancelar
            </Button>
          </section>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
