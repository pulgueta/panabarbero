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
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import { Spinner } from "@/components/ui/spinner";
import { useBarbershopMetadataActions } from "@/hooks/barbershop/use-barbershop-metadata";
import { getLogoUrl, useUpload } from "@/hooks/use-upload";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { cn } from "@/lib/utils";

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp,image/avif";

type BarbershopLogoUploaderProps = {
  barbershopId: Id<"barbershops">;
  logoKey?: string | null;
};

export const BarbershopLogoUploader: FC<BarbershopLogoUploaderProps> = ({
  barbershopId,
  logoKey,
}) => {
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteFinalConfirmOpen, setDeleteFinalConfirmOpen] = useState(false);

  const { trigger } = useWebHaptics();

  const {
    uploadFile: { isUploading, uploadFile },
  } = useUpload({
    type: "barbershop-logo",
  });

  const {
    setLogoKeyMutation: { mutateAsync: setLogoKey },
    removeLogoKeyMutation: {
      mutateAsync: removeLogoKey,
      isPending: isRemoving,
    },
  } = useBarbershopMetadataActions();

  const onFileReject = useCallback<
    NonNullable<FileUploadProps["onFileReject"]>
  >(
    (_file, message) => {
      toast.error(message);
      trigger("warning");
    },
    [trigger],
  );

  const isBusy = isUploading || isRemoving;
  const hasQueuedFiles = queuedFiles.length > 0;

  const logoUrl = getLogoUrl(logoKey);

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
      const key = await uploadFile(file);

      await setLogoKey({
        barbershopId,
        logoKey: key,
      });

      toast.success("Logo actualizado correctamente");
      trigger("success");
      setQueuedFiles([]);
    } catch (error) {
      console.log(error);
      toast.error(getConvexErrorMessage(error));
      trigger("error");
      return;
    }
  };

  const handleRemoveClick = () => {
    setDeleteConfirmOpen(true);
  };

  const handleFirstConfirm = () => {
    setDeleteConfirmOpen(false);
    setDeleteFinalConfirmOpen(true);
  };

  const onRemoveLogo = async () => {
    setDeleteFinalConfirmOpen(false);

    try {
      await removeLogoKey({ barbershopId });

      toast.success("Logo eliminado");
      trigger("success");
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
      trigger("error");
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

      {/* First confirmation modal */}
      <ResponsiveModal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
      >
        <ResponsiveModalContent>
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>¿Estás seguro?</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              ¿Deseas eliminar el logo de tu barbería?
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleFirstConfirm}>Confirmar</Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

      {/* Second confirmation modal */}
      <ResponsiveModal
        open={deleteFinalConfirmOpen}
        onOpenChange={setDeleteFinalConfirmOpen}
      >
        <ResponsiveModalContent>
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Confirmar eliminación</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              Esta acción es irreversible. ¿Confirmas que deseas eliminar el
              logo de tu barbería?
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteFinalConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={onRemoveLogo}
              variant="destructive"
              disabled={isRemoving}
            >
              {isRemoving ? (
                <>
                  <SpinnerGapIcon
                    className="size-3.5 animate-spin"
                    weight="bold"
                  />
                  Eliminando…
                </>
              ) : (
                "Sí, eliminar"
              )}
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

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
              "hover:bg-accent/20",
              isBusy && "pointer-events-none opacity-60",
            )}
          >
            {/* Preview / placeholder */}
            <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
              {logoUrl ? (
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
                PNG, JPG, WebP o AVIF, máx. 2 MB
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
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    disabled={isRemoving}
                  >
                    {isRemoving ? <Spinner /> : <TrashIcon />}
                  </Button>
                </FileUploadItemDelete>
              </FileUploadItem>
            ))}
          </FileUploadList>
        </FileUpload>

        {/* Action buttons */}
        <div
          className={cn("grid gap-4", {
            "grid-cols-1": !hasQueuedFiles,
            "grid-cols-2": hasQueuedFiles && logoUrl,
          })}
        >
          {hasQueuedFiles && (
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? <Spinner /> : <UploadIcon />}
              Subir logo
            </Button>
          )}

          {logoUrl && (
            <Button
              type="button"
              variant="destructive"
              disabled={isBusy}
              onClick={handleRemoveClick}
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
