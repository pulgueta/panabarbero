import { TrashIcon, UserIcon } from "@phosphor-icons/react";
import type { FC } from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useProfileActions } from "@/hooks/use-profile";

interface ProfilePhotoUploaderProps {
  /** The current profile photo URL resolved from R2 */
  currentPhotoUrl: string | null;
  /** Fallback photo URL from auth provider (Google, etc.) */
  authProviderImage?: string | null;
  /** User's name for avatar fallback */
  userName?: string | null;
}

export const ProfilePhotoUploader: FC<ProfilePhotoUploaderProps> = ({
  currentPhotoUrl,
  authProviderImage,
  userName,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const {
    generateUploadUrlMutation: { mutateAsync: generateUploadUrl },
    setProfilePhotoKeyMutation: {
      mutateAsync: setProfilePhotoKey,
      isPending: isSavingKey,
    },
    removeProfilePhotoMutation: {
      mutateAsync: removeProfilePhoto,
      isPending: isRemoving,
    },
  } = useProfileActions();

  const haptic = useWebHaptics();
  const isPending = isUploading || isSavingKey || isRemoving;

  // Determine which image to show: preview > R2 photo > auth provider > fallback
  const displayPhotoUrl = previewUrl ?? currentPhotoUrl ?? authProviderImage;

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  };

  const handleSelectFile = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecciona un archivo de imagen válido.");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("La imagen debe ser menor a 5MB.");
      return;
    }

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      setIsUploading(true);

      // Generate upload URL from Convex R2 component
      const { url, key } = await generateUploadUrl({});

      // Upload the file directly to R2
      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Error al subir la imagen");
      }

      // Save the key to the user's profile
      await setProfilePhotoKey({ key });

      haptic.trigger("success");
      toast.success("Foto de perfil actualizada");
    } catch (error) {
      console.error("Error uploading profile photo:", error);
      haptic.trigger("error");
      toast.error("Error al subir la imagen. Intenta de nuevo.");
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      // Clear the input so the same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleRemovePhoto = async () => {
    try {
      await removeProfilePhoto({});
      setPreviewUrl(null);
      haptic.trigger("success");
      toast.success("Foto de perfil eliminada");
    } catch (error) {
      console.error("Error removing profile photo:", error);
      haptic.trigger("error");
      toast.error("Error al eliminar la foto. Intenta de nuevo.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Foto de perfil</CardTitle>
        <CardDescription>
          Sube una foto para personalizar tu perfil. Máximo 5MB.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="size-16">
              <AvatarImage
                src={displayPhotoUrl ?? undefined}
                alt="Foto de perfil"
              />
              <AvatarFallback className="text-xl">
                {userName ? (
                  getInitials(userName)
                ) : (
                  <UserIcon className="size-8" />
                )}
              </AvatarFallback>
            </Avatar>
            {isPending && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                <Spinner className="size-6 text-white" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isPending}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleSelectFile}
              disabled={isPending}
            >
              {currentPhotoUrl ? "Cambiar foto" : "Subir foto"}
            </Button>
            {currentPhotoUrl && (
              <Button
                type="button"
                variant="outline"
                onClick={handleRemovePhoto}
                disabled={isPending}
              >
                <TrashIcon className="mr-1.5 size-4" />
                Eliminar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
