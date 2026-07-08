import type { Barbershop, BarbershopMetadata } from "@convex/schema";
import type { FC, SVGProps } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { Facebook } from "@/components/icons/facebook-icon";
import { Instagram } from "@/components/icons/instagram-icon";
import { Tiktok } from "@/components/icons/tiktok-icon";
import { Twitter } from "@/components/icons/twitter-icon";
import { Youtube } from "@/components/icons/youtube-icon";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useSocialMediaActions } from "@/hooks/barbershop/use-barbershop-metadata";

type SocialLink = NonNullable<BarbershopMetadata["socialMedia"]>[number];
type Platform = SocialLink["platform"];

const PLATFORMS: {
  platform: Platform;
  label: string;
  Icon: FC<SVGProps<SVGSVGElement>>;
  placeholder: string;
}[] = [
  {
    platform: "instagram",
    label: "Instagram",
    Icon: Instagram,
    placeholder: "https://instagram.com/tu-barberia",
  },
  {
    platform: "tiktok",
    label: "TikTok",
    Icon: Tiktok,
    placeholder: "https://tiktok.com/@tu-barberia",
  },
  {
    platform: "facebook",
    label: "Facebook",
    Icon: Facebook,
    placeholder: "https://facebook.com/tu-barberia",
  },
  {
    platform: "twitter",
    label: "Twitter",
    Icon: Twitter,
    placeholder: "https://twitter.com/tu-barberia",
  },
  {
    platform: "youtube",
    label: "YouTube",
    Icon: Youtube,
    placeholder: "https://youtube.com/@tu-barberia",
  },
];

interface SocialMediaFormProps {
  barbershopId: Barbershop["_id"];
  socialMedia: SocialLink[];
  /** Only owners may remove links. */
  canDelete: boolean;
}

const isValidUrl = (value: string) => {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const SocialMediaForm: FC<SocialMediaFormProps> = ({
  barbershopId,
  socialMedia,
  canDelete,
}) => {
  const initial = Object.fromEntries(
    PLATFORMS.map(({ platform }) => [
      platform,
      socialMedia.find((l) => l.platform === platform)?.url ?? "",
    ]),
  ) as Record<Platform, string>;

  const [urls, setUrls] = useState<Record<Platform, string>>(initial);
  const [pending, setPending] = useState<Platform | null>(null);
  const [removing, setRemoving] = useState<Platform | null>(null);

  const {
    upsertSocialLinkMutation: { mutateAsync: upsertSocialLink },
    removeSocialLinkMutation: { mutateAsync: removeSocialLink },
  } = useSocialMediaActions();

  const haptic = useWebHaptics();

  const onSave = async (platform: Platform) => {
    const url = urls[platform].trim();

    if (!isValidUrl(url)) {
      toast.error("Ingresa un enlace válido (https://...)");

      return;
    }

    setPending(platform);

    try {
      await upsertSocialLink({ barbershopId, platform, url });
      haptic.trigger("success");
      toast.success("Red social actualizada correctamente");
    } catch {
      haptic.trigger("error");
      toast.error("No se pudo guardar el enlace. Intenta de nuevo.");
    } finally {
      setPending(null);
    }
  };

  const onRemove = async (platform: Platform) => {
    setRemoving(platform);

    try {
      await removeSocialLink({ barbershopId, platform });
      setUrls((prev) => ({ ...prev, [platform]: "" }));
      haptic.trigger("success");
      toast.success("Red social eliminada correctamente");
    } catch {
      haptic.trigger("error");
      toast.error("No se pudo eliminar el enlace. Intenta de nuevo.");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="grid w-full grid-cols-1 gap-4">
      {PLATFORMS.map(({ platform, label, Icon, placeholder }) => {
        const saved = socialMedia.find((l) => l.platform === platform)?.url;
        const current = urls[platform].trim();
        const isDirty = current !== (saved ?? "");

        return (
          <Field key={platform}>
            <FieldLabel
              htmlFor={`social-${platform}`}
              className="flex items-center gap-2"
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </FieldLabel>

            <div className="flex items-center gap-2">
              <Input
                id={`social-${platform}`}
                type="url"
                inputMode="url"
                placeholder={placeholder}
                value={urls[platform]}
                onChange={(e) =>
                  setUrls((prev) => ({ ...prev, [platform]: e.target.value }))
                }
              />

              <Button
                variant="outline"
                onClick={() => onSave(platform)}
                disabled={!isDirty || !current || pending === platform}
              >
                {pending === platform ? <Spinner /> : "Guardar"}
              </Button>

              {canDelete && saved && (
                <Button
                  variant="ghost"
                  onClick={() => onRemove(platform)}
                  disabled={removing === platform}
                >
                  {removing === platform ? <Spinner /> : "Eliminar"}
                </Button>
              )}
            </div>
          </Field>
        );
      })}
    </div>
  );
};
