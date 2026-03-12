import {
  CameraIcon,
  SpinnerGapIcon,
  TrashIcon,
  UploadIcon,
} from "@phosphor-icons/react";
import type { Id } from "convex/_generated/dataModel";
import type { FC } from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { Button } from "@/components/ui/button";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  type FileUploadProps,
} from "@/components/ui/file-upload";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  getLogoUrl,
  useRemoveBarbershopLogo,
  useUploadBarbershopLogo,
} from "@/hooks/barbershop/use-barbershop-logo-actions";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { cn } from "@/lib/utils";

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp,image/avif";

type BarbershopLogoUploaderProps = {
  barbershopId: Id<"barbershops">;
  userId: string;
  logoKey?: string | null;
};

export const BarbershopLogoUploader: FC<BarbershopLogoUploaderProps> = ({
  barbershopId,
  userId,
  logoKey,
}) => {
  const logoUrl = getLogoUrl(logoKey);
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);

  const { trigger } = useWebHaptics();

  const { mutateAsync: uploadBarbershopLogo, isPending: isUploading } =
    useUploadBarbershopLogo();
  const { mutateAsync: removeBarbershopLogo, isPending: isRemoving } =
    useRemoveBarbershopLogo();

  const isBusy = isUploading || isRemoving;
  const hasQueuedFiles = queuedFiles.length > 0;

  const onFileReject = useCallback<
    NonNullable<FileUploadProps["onFileReject"]>
  >(
    (_file, message) => {
      toast.error(message);
      trigger("warning");
    },
    [trigger],
  );

  // Intercept newly added files and send them to the crop dialog instead
  const handleValueChange = useCallback(
    (files: File[]) => {
      const currentSet = new Set(queuedFiles);
      const newFile = files.find((f) => !currentSet.has(f));

      if (newFile) {
        setFileToCrop(newFile);
        // Don't add to queue yet — wait for crop confirmation
      } else {
        setQueuedFiles(files);
      }
    },
    [queuedFiles],
  );

  const handleCropConfirm = useCallback((croppedFile: File) => {
    setFileToCrop(null);
    setQueuedFiles([croppedFile]);
  }, []);

  const handleCropCancel = useCallback(() => {
    setFileToCrop(null);
    setQueuedFiles([]);
  }, []);

  const handleUpload = async () => {
    if (!hasQueuedFiles) return;

    const file = queuedFiles[0];

    try {
      await uploadBarbershopLogo({
        file,
        barbershopId,
        userId,
      });

      toast.success("Logo actualizado correctamente");
      trigger("success");
      setQueuedFiles([]);
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
      trigger("error");
      return;
    }
  };

  const onRemoveLogo = async () => {
    try {
      await removeBarbershopLogo({ barbershopId, userId });

      toast.success("Logo eliminado");
      trigger("success");
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
      trigger("error");
      return;
    }
  };

  return (
    <>
      <ImageCropDialog
        file={fileToCrop}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
        aspectRatio={1}
        shape="rectangle"
      />

      <div className="space-y-3">
        <FileUpload
          value={queuedFiles}
          onValueChange={handleValueChange}
          maxFiles={1}
          maxSize={MAX_LOGO_SIZE}
          accept={ACCEPTED_TYPES}
          disabled={isBusy}
          onFileReject={onFileReject}
          onFileValidate={(file) => {
            if (file.size > MAX_LOGO_SIZE) {
              return "El archivo no debe superar 2 MB";
            }
            if (!ACCEPTED_TYPES.split(",").includes(file.type)) {
              return "Solo se permiten imágenes PNG, JPG, WebP o AVIF";
            }
            return null;
          }}
        >
          <FileUploadDropzone
            className={cn(
              "group relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-all",
              "hover:border-primary/40 hover:bg-accent/20",
              isBusy && "pointer-events-none opacity-60",
            )}
          >
            {/* Preview / placeholder */}
            <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
              {logoUrl && !hasQueuedFiles ? (
                <img
                  src={logoUrl}
                  alt="Logo actual de la barbería"
                  className="size-full object-cover"
                />
              ) : (
                <CameraIcon
                  className="size-8 text-muted-foreground/50"
                  weight="thin"
                />
              )}
            </div>

            {/* Instructions */}
            <div className="text-center">
              <p className="font-medium text-sm">
                {logoUrl
                  ? "Arrastra una imagen para reemplazar el logo"
                  : "Arrastra o selecciona el logo de tu barbería"}
              </p>
              <p className="mt-0.5 text-muted-foreground text-xs">
                PNG, JPG, WebP o AVIF — máx. 2 MB
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBusy}
              className="pointer-events-none"
            >
              <UploadIcon className="size-3.5" />
              {logoUrl ? "Cambiar logo" : "Subir logo"}
            </Button>
          </FileUploadDropzone>

          {/* File queue list */}
          <FileUploadList>
            {queuedFiles.map((file) => (
              <FileUploadItem key={file.name + file.size} value={file}>
                <FileUploadItemPreview
                  render={(file) => {
                    const url = URL.createObjectURL(file);
                    return (
                      <img
                        src={url}
                        alt={file.name}
                        className="size-full object-cover"
                        onLoad={() => URL.revokeObjectURL(url)}
                      />
                    );
                  }}
                />
                <FileUploadItemMetadata size="sm" />
                <FileUploadItemDelete asChild>
                  <Button type="button" variant="destructive" size="icon">
                    <TrashIcon />
                  </Button>
                </FileUploadItemDelete>
              </FileUploadItem>
            ))}
          </FileUploadList>
        </FileUpload>

        {/* Action buttons */}
        <div className="flex gap-2">
          {hasQueuedFiles && (
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <SpinnerGapIcon
                    className="size-3.5 animate-spin"
                    weight="bold"
                  />
                  Subiendo...
                </>
              ) : (
                <>
                  <UploadIcon className="size-3.5" />
                  Subir logo
                </>
              )}
            </Button>
          )}

          {logoUrl && (
            <Button
              type="button"
              variant="destructive"
              disabled={isBusy}
              onClick={onRemoveLogo}
              className="w-full"
            >
              {isRemoving ? <Spinner /> : <TrashIcon />}
              Eliminar logo
            </Button>
          )}
        </div>
      </div>
    </>
  );
};
