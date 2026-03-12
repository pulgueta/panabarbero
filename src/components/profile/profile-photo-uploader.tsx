import {
  CameraIcon,
  SpinnerGapIcon,
  TrashIcon,
  UploadIcon,
  UserIcon,
} from "@phosphor-icons/react";
import type { FC } from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  useRemoveProfilePhoto,
  useUploadProfilePhoto,
} from "@/hooks/use-profile-photo-actions";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { cn } from "@/lib/utils";

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp,image/avif";

function getInitials(name?: string | null) {
  if (!name) return null;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

interface ProfilePhotoUploaderProps {
  /** Current photo URL from Better Auth user.image (R2 or OAuth provider) */
  currentPhotoUrl?: string | null;
  /** User's name for avatar initials fallback */
  userName?: string | null;
}

export const ProfilePhotoUploader: FC<ProfilePhotoUploaderProps> = ({
  currentPhotoUrl,
  userName,
}) => {
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);

  const { trigger } = useWebHaptics();
  const { mutateAsync: uploadProfilePhoto, isPending: isUploading } =
    useUploadProfilePhoto();
  const { mutateAsync: removeProfilePhoto, isPending: isRemoving } =
    useRemoveProfilePhoto();

  const isBusy = isUploading || isRemoving;
  const hasQueuedFiles = queuedFiles.length > 0;

  const initials = getInitials(userName);

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
      await uploadProfilePhoto({ file, previousImageUrl: currentPhotoUrl });
      toast.success("Foto de perfil actualizada");
      trigger("success");
      setQueuedFiles([]);
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
      trigger("error");
      return;
    }
  };

  const handleRemove = async () => {
    try {
      await removeProfilePhoto({ previousImageUrl: currentPhotoUrl });
      toast.success("Foto de perfil eliminada");
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

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        {/* Avatar preview */}
        <div className="relative shrink-0">
          <Avatar className="size-43 border border-border">
            <AvatarImage
              src={currentPhotoUrl ?? undefined}
              alt="Foto de perfil"
            />
            <AvatarFallback className="text-2xl">
              {initials ?? <UserIcon className="size-9" weight="thin" />}
            </AvatarFallback>
          </Avatar>
          {isBusy && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
              <SpinnerGapIcon
                className="size-5 animate-spin text-white"
                weight="bold"
              />
            </div>
          )}
        </div>

        {/* Upload area */}
        <div className="w-full min-w-0 space-y-4">
          <FileUpload
            value={queuedFiles}
            onValueChange={handleValueChange}
            maxFiles={1}
            maxSize={MAX_PHOTO_SIZE}
            accept={ACCEPTED_TYPES}
            disabled={isBusy}
            onFileReject={onFileReject}
            onFileValidate={(file) => {
              if (file.size > MAX_PHOTO_SIZE) {
                return "El archivo no debe superar 5 MB";
              }
              if (!ACCEPTED_TYPES.split(",").includes(file.type)) {
                return "Solo se permiten imágenes PNG, JPG, WebP o AVIF";
              }
              return null;
            }}
          >
            <FileUploadDropzone
              className={cn(
                "group flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 transition-all",
                "hover:border-primary/40 hover:bg-accent/20",
                isBusy && "pointer-events-none opacity-60",
              )}
            >
              <CameraIcon
                className="size-6 text-muted-foreground/60"
                weight="thin"
              />
              <div className="text-center">
                <p className="font-medium text-sm">
                  {currentPhotoUrl
                    ? "Arrastra una imagen para reemplazar tu foto"
                    : "Arrastra o selecciona tu foto de perfil"}
                </p>
                <p className="mt-0.5 text-muted-foreground text-xs">
                  PNG, JPG, WebP o AVIF — máx. 5 MB
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
                {currentPhotoUrl ? "Cambiar foto" : "Subir foto"}
              </Button>
            </FileUploadDropzone>

            <FileUploadList>
              {queuedFiles.map((file) => (
                <FileUploadItem key={file.name + file.size} value={file}>
                  <FileUploadItemPreview />
                  <FileUploadItemMetadata size="sm" />
                  <FileUploadItemDelete asChild>
                    <Button type="button" variant="destructive" size="icon">
                      <TrashIcon weight="bold" />
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
                    Guardar foto
                  </>
                )}
              </Button>
            )}

            {currentPhotoUrl && !hasQueuedFiles && (
              <Button
                type="button"
                variant="destructive"
                disabled={isBusy}
                onClick={handleRemove}
                className="w-full"
              >
                {isRemoving ? <Spinner /> : <TrashIcon />}
                Eliminar foto
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
