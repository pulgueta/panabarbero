import {
  FilePdfIcon,
  TrashIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import type { ChangeEventHandler, FC } from "react";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment";
import { Spinner } from "@/components/ui/spinner";
import {
  isSaleProofContentType,
  MAX_SALE_PROOF_SIZE,
  SALE_PROOF_ACCEPT,
} from "@/lib/inventory-sale-proof";

const sizeFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 1,
});

function formatProofSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${sizeFormatter.format(bytes / (1024 * 1024))} MB`
    : `${sizeFormatter.format(Math.max(1, Math.round(bytes / 1024)))} KB`;
}

interface ProofAttachmentProps {
  file: File | undefined;
  onFileChange: (file: File | undefined) => void;
  isUploading: boolean;
  disabled?: boolean;
}

export const ProofAttachment: FC<ProofAttachmentProps> = ({
  file,
  onFileChange,
  isUploading,
  disabled,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const attachTriggerRef = useRef<HTMLButtonElement>(null);

  const previewUrl = useMemo(
    () =>
      file && file.type !== "application/pdf"
        ? URL.createObjectURL(file)
        : undefined,
    [file],
  );

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const onInputChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const selected = event.target.files?.[0];
    // Allow re-selecting the same file after removing it.
    event.target.value = "";

    if (!selected) return;
    if (!isSaleProofContentType(selected.type)) {
      toast.error("Solo se permiten imágenes o archivos PDF");
      return;
    }
    if (selected.size > MAX_SALE_PROOF_SIZE) {
      toast.error("El comprobante no debe superar 8 MB");
      return;
    }

    onFileChange(selected);
  };

  return (
    <div className="space-y-2">
      <div>
        <p className="font-medium text-sm">Comprobante de pago</p>
        <p className="text-muted-foreground text-xs">
          Opcional. Imagen o PDF de máximo 8 MB.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={SALE_PROOF_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={onInputChange}
      />

      {file ? (
        <Attachment
          state={isUploading ? "uploading" : "done"}
          className="w-full"
        >
          <AttachmentMedia variant={previewUrl ? "image" : "icon"}>
            {isUploading ? (
              <Spinner />
            ) : previewUrl ? (
              <img src={previewUrl} alt={`Comprobante ${file.name}`} />
            ) : (
              <FilePdfIcon />
            )}
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{file.name}</AttachmentTitle>
            <AttachmentDescription>
              {isUploading
                ? "Subiendo comprobante"
                : `${file.type === "application/pdf" ? "PDF" : "Imagen"} · ${formatProofSize(file.size)}`}
            </AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction
              aria-label="Quitar comprobante"
              disabled={disabled || isUploading}
              onClick={() => {
                onFileChange(undefined);
                // The remove button unmounts with the card — hand focus to
                // the idle attach trigger so keyboard users aren't dropped.
                requestAnimationFrame(() => attachTriggerRef.current?.focus());
              }}
            >
              <TrashIcon />
            </AttachmentAction>
          </AttachmentActions>
          <AttachmentTrigger
            aria-label="Cambiar comprobante"
            disabled={disabled || isUploading}
            onClick={() => inputRef.current?.click()}
          />
        </Attachment>
      ) : (
        <Attachment state="idle" className="w-full">
          <AttachmentMedia>
            <UploadSimpleIcon />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>Adjuntar comprobante</AttachmentTitle>
            <AttachmentDescription>
              PNG, JPG, WebP, AVIF o PDF
            </AttachmentDescription>
          </AttachmentContent>
          <AttachmentTrigger
            ref={attachTriggerRef}
            aria-label="Adjuntar comprobante"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          />
        </Attachment>
      )}
    </div>
  );
};
