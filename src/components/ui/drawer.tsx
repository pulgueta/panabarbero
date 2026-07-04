import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import type { ComponentProps, FC } from "react";

import { cn } from "@/lib/utils";

export const Drawer: FC<ComponentProps<typeof DrawerPrimitive.Root>> = ({
  ...props
}) => <DrawerPrimitive.Root data-slot="drawer" {...props} />;

export const DrawerTrigger: FC<
  ComponentProps<typeof DrawerPrimitive.Trigger>
> = (props) => {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
};

const DrawerPortal: FC<ComponentProps<typeof DrawerPrimitive.Portal>> = ({
  ...props
}) => {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
};

export const DrawerClose: FC<ComponentProps<typeof DrawerPrimitive.Close>> = ({
  ...props
}) => {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
};

const DrawerOverlay: FC<ComponentProps<typeof DrawerPrimitive.Backdrop>> = ({
  className,
  ...props
}) => {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="drawer-overlay"
      className={cn(
        "data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 bg-black/10 data-closed:animate-out data-open:animate-in data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
        className,
      )}
      {...props}
    />
  );
};

export const DrawerContent: FC<
  ComponentProps<typeof DrawerPrimitive.Popup>
> = ({ className, children, ...props }) => {
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Viewport
        data-slot="drawer-viewport"
        className="fixed inset-0 z-50"
      >
        <DrawerPrimitive.Popup
          data-slot="drawer-content"
          className={cn(
            "group/drawer-content data-open:fade-in-0 fixed z-50 flex h-auto flex-col bg-background text-sm transition duration-200 ease-in-out data-closed:animate-out data-open:animate-in",
            "data-[swipe-direction=right]:transform-[translateX(var(--drawer-swipe-movement-x))] data-[swipe-direction=right]:data-ending-style:translate-x-full data-[swipe-direction=right]:data-starting-style:translate-x-full data-[swipe-direction=right]:inset-y-0 data-[swipe-direction=right]:right-0 data-[swipe-direction=right]:h-full data-[swipe-direction=right]:w-3/4 data-[swipe-direction=right]:max-w-sm data-[swipe-direction=right]:rounded-l-2xl data-[swipe-direction=right]:border-l",
            "data-[swipe-direction=left]:transform-[translateX(var(--drawer-swipe-movement-x))] data-[swipe-direction=left]:data-ending-style:-translate-x-full data-[swipe-direction=left]:data-starting-style:-translate-x-full data-[swipe-direction=left]:inset-y-0 data-[swipe-direction=left]:left-0 data-[swipe-direction=left]:h-full data-[swipe-direction=left]:w-3/4 data-[swipe-direction=left]:max-w-sm data-[swipe-direction=left]:rounded-r-2xl data-[swipe-direction=left]:border-r",
            "data-[swipe-direction=down]:transform-[translateY(var(--drawer-swipe-movement-y))] data-[swipe-direction=down]:data-ending-style:translate-y-full data-[swipe-direction=down]:data-starting-style:translate-y-full data-[swipe-direction=down]:inset-x-0 data-[swipe-direction=down]:bottom-0 data-[swipe-direction=down]:max-h-[85vh] data-[swipe-direction=down]:w-full data-[swipe-direction=down]:rounded-t-2xl data-[swipe-direction=down]:border-t data-[swipe-direction=down]:pb-[env(safe-area-inset-bottom)]",
            "data-[swipe-direction=up]:transform-[translateY(var(--drawer-swipe-movement-y))] data-[swipe-direction=up]:data-ending-style:-translate-y-full data-[swipe-direction=up]:data-starting-style:-translate-y-full data-[swipe-direction=up]:inset-x-0 data-[swipe-direction=up]:top-0 data-[swipe-direction=up]:max-h-[80vh] data-[swipe-direction=up]:w-full data-[swipe-direction=up]:rounded-b-2xl data-[swipe-direction=up]:border-b",
            className,
          )}
          {...props}
        >
          <div className="mx-auto mt-4 hidden h-1 w-[100px] shrink-0 rounded-full bg-muted group-data-[swipe-direction=down]/drawer-content:block" />
          <DrawerPrimitive.Content data-slot="drawer-inner-content">
            {children}
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPortal>
  );
};

export const DrawerHeader: FC<ComponentProps<"div">> = ({
  className,
  ...props
}) => {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "flex flex-col gap-0.5 p-4 group-data-[swipe-direction=down]/drawer-content:text-center group-data-[swipe-direction=up]/drawer-content:text-center md:gap-0.5 md:text-left",
        className,
      )}
      {...props}
    />
  );
};

export const DrawerFooter: FC<ComponentProps<"div">> = ({
  className,
  ...props
}) => {
  return (
    <div
      data-slot="drawer-footer"
      className={cn(
        "mt-auto flex flex-col gap-4 p-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
        className,
      )}
      {...props}
    />
  );
};

export const DrawerTitle: FC<ComponentProps<typeof DrawerPrimitive.Title>> = ({
  className,
  ...props
}) => {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("font-medium text-base text-foreground", className)}
      {...props}
    />
  );
};

export const DrawerDescription: FC<
  ComponentProps<typeof DrawerPrimitive.Description>
> = ({ className, ...props }) => {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
};
