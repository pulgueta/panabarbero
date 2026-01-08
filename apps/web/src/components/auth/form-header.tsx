import { Link } from "@tanstack/react-router";
import { GalleryVerticalEnd } from "lucide-react";

export const FormHeader = () => {
  return (
    <Link
      to="/"
      className="flex items-center gap-2 self-center font-semibold text-xl tracking-tighter"
      style={{ viewTransitionName: "logo" }}
    >
      <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <GalleryVerticalEnd className="size-4" />
      </div>
      PanaBarbero
    </Link>
  );
};
