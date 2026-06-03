import {
  ArrowCounterClockwiseIcon,
  CheckIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { FC } from "react";
import { useCallback, useEffect, useReducer } from "react";

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

type CropState = {
  imageUrl: string | null;
  crop: { x: number; y: number };
  zoom: number;
  rotation: number;
  croppedAreaPixels: CropperAreaData | null;
  isProcessing: boolean;
};

type CropAction =
  | { type: "setImageUrl"; imageUrl: string | null }
  | { type: "resetView" }
  | { type: "setCrop"; crop: { x: number; y: number } }
  | { type: "setZoom"; zoom: number }
  | { type: "setRotation"; rotation: number }
  | { type: "setCroppedAreaPixels"; croppedAreaPixels: CropperAreaData | null }
  | { type: "setProcessing"; isProcessing: boolean }
  | { type: "loadImage"; imageUrl: string };

const initialCropState: CropState = {
  imageUrl: null,
  crop: { x: 0, y: 0 },
  zoom: 1,
  rotation: 0,
  croppedAreaPixels: null,
  isProcessing: false,
};

function cropReducer(state: CropState, action: CropAction): CropState {
  switch (action.type) {
    case "setImageUrl":
      return { ...state, imageUrl: action.imageUrl };
    case "resetView":
      return { ...state, crop: { x: 0, y: 0 }, zoom: 1, rotation: 0 };
    case "setCrop":
      return { ...state, crop: action.crop };
    case "setZoom":
      return { ...state, zoom: action.zoom };
    case "setRotation":
      return { ...state, rotation: action.rotation };
    case "setCroppedAreaPixels":
      return { ...state, croppedAreaPixels: action.croppedAreaPixels };
    case "setProcessing":
      return { ...state, isProcessing: action.isProcessing };
    case "loadImage":
      return {
        ...state,
        imageUrl: action.imageUrl,
        crop: { x: 0, y: 0 },
        zoom: 1,
        rotation: 0,
        croppedAreaPixels: null,
      };
    default:
      return state;
  }
}

export const ImageCropDialog: FC<ImageCropDialogProps> = ({
  file,
  onConfirm,
  onCancel,
  aspectRatio = 1,
  shape = "rectangle",
}) => {
  const [
    { imageUrl, crop, zoom, rotation, croppedAreaPixels, isProcessing },
    dispatch,
  ] = useReducer(cropReducer, initialCropState);

  const open = file !== null;

  useEffect(() => {
    if (!file) {
      dispatch({ type: "setImageUrl", imageUrl: null });
      return;
    }

    const url = URL.createObjectURL(file);
    dispatch({ type: "loadImage", imageUrl: url });

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleCropComplete = useCallback(
    (_croppedArea: CropperAreaData, pixels: CropperAreaData) => {
      dispatch({ type: "setCroppedAreaPixels", croppedAreaPixels: pixels });
    },
    [],
  );

  const handleReset = useCallback(() => {
    dispatch({ type: "resetView" });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!imageUrl || !croppedAreaPixels || !file) return;

    dispatch({ type: "setProcessing", isProcessing: true });
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
      dispatch({ type: "setProcessing", isProcessing: false });
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
              onCropChange={(value) =>
                dispatch({ type: "setCrop", crop: value })
              }
              onZoomChange={(value) =>
                dispatch({ type: "setZoom", zoom: value })
              }
              onRotationChange={(value) =>
                dispatch({ type: "setRotation", rotation: value })
              }
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
