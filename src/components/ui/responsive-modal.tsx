/**
 * ResponsiveModal — Unified responsive modal primitive.
 *
 * Renders a Dialog on md+ screens and a bottom-sheet Drawer on mobile.
 * Each instance manages its own state independently — no shared global state,
 * so multiple instances never collide.
 *
 * Usage (identical API for both uncontrolled and externally-controlled):
 *
 *   // Uncontrolled (trigger manages open state via base-ui):
 *   <ResponsiveModal>
 *     <ResponsiveModalTrigger render={<Button>Open</Button>} />
 *     <ResponsiveModalContent>
 *       <ResponsiveModalHeader>
 *         <ResponsiveModalTitle>Title</ResponsiveModalTitle>
 *         <ResponsiveModalDescription>Description</ResponsiveModalDescription>
 *       </ResponsiveModalHeader>
 *       ...content...
 *       <ResponsiveModalFooter>
 *         <Button>Confirm</Button>
 *       </ResponsiveModalFooter>
 *     </ResponsiveModalContent>
 *   </ResponsiveModal>
 *
 *   // Externally controlled (e.g. opened from a dropdown):
 *   const [open, setOpen] = useState(false);
 *   <ResponsiveModal open={open} onOpenChange={setOpen}>
 *     <ResponsiveModalContent>...</ResponsiveModalContent>
 *   </ResponsiveModal>
 */

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { DrawerPreview as DrawerPrimitive } from "@base-ui/react/drawer";
import type { ComponentProps, ReactNode } from "react";
import { createContext, use } from "react";

import { useIsMobile } from "@/hooks/use-is-mobile";
import { cn } from "@/lib/utils";

import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import {
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer";

// ---------------------------------------------------------------------------
// Context — communicates `isMobile` state to all sub-components
// ---------------------------------------------------------------------------

interface ResponsiveModalContextValue {
  isMobile: boolean;
}

const ResponsiveModalContext = createContext<ResponsiveModalContextValue>({
  isMobile: false,
});

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

interface ResponsiveModalProps {
  /** Controlled open state. Omit to let base-ui manage state via the trigger. */
  open?: boolean;
  /** Called when the modal requests an open/close state change. */
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

/**
 * Root component. Renders a Dialog on ≥md and a bottom Drawer on mobile.
 * Wrap all ResponsiveModal* sub-components inside this.
 */
function ResponsiveModal({
  open,
  onOpenChange,
  children,
}: ResponsiveModalProps) {
  const { isMobile } = useIsMobile();

  if (isMobile) {
    return (
      <ResponsiveModalContext.Provider value={{ isMobile: true }}>
        <DrawerPrimitive.Root
          data-slot="responsive-modal"
          open={open}
          onOpenChange={onOpenChange}
          swipeDirection="down"
        >
          {children}
        </DrawerPrimitive.Root>
      </ResponsiveModalContext.Provider>
    );
  }

  return (
    <ResponsiveModalContext.Provider value={{ isMobile: false }}>
      <DialogPrimitive.Root
        data-slot="responsive-modal"
        open={open}
        onOpenChange={onOpenChange}
      >
        {children}
      </DialogPrimitive.Root>
    </ResponsiveModalContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Trigger
// ---------------------------------------------------------------------------

type ResponsiveModalTriggerProps = ComponentProps<typeof DialogTrigger> &
  ComponentProps<typeof DrawerTrigger>;

/**
 * Trigger element. Accepts the same `render` / `nativeButton` API as DialogTrigger.
 * For externally-controlled modals, simply omit this and manage `open` on the root.
 */
function ResponsiveModalTrigger({ ...props }: ResponsiveModalTriggerProps) {
  const { isMobile } = use(ResponsiveModalContext);
  if (isMobile)
    return <DrawerTrigger data-slot="responsive-modal-trigger" {...props} />;
  return <DialogTrigger data-slot="responsive-modal-trigger" {...props} />;
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

interface ResponsiveModalContentProps extends ComponentProps<"div"> {
  /** Show the built-in close (×) button top-right. Default: true. Ignored on mobile (swipe-to-dismiss). */
  showCloseButton?: boolean;
  children?: ReactNode;
}

/**
 * Modal content shell. Renders DialogContent on desktop, DrawerContent (bottom-sheet) on mobile.
 * The close button only appears on desktop; mobile users swipe down to dismiss.
 */
function ResponsiveModalContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: ResponsiveModalContentProps) {
  const { isMobile } = use(ResponsiveModalContext);

  if (isMobile) {
    return (
      <DrawerContent
        data-slot="responsive-modal-content"
        className={cn("px-4", className)}
        {...(props as ComponentProps<typeof DrawerContent>)}
      >
        {children}
      </DrawerContent>
    );
  }

  return (
    <DialogContent
      data-slot="responsive-modal-content"
      showCloseButton={showCloseButton}
      className={className}
      {...(props as ComponentProps<typeof DialogContent>)}
    >
      {children}
    </DialogContent>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function ResponsiveModalHeader({ className, ...props }: ComponentProps<"div">) {
  const { isMobile } = use(ResponsiveModalContext);

  if (isMobile) {
    return (
      <DrawerHeader
        data-slot="responsive-modal-header"
        className={className}
        {...props}
      />
    );
  }

  return (
    <div
      data-slot="responsive-modal-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

interface ResponsiveModalFooterProps extends ComponentProps<"div"> {
  /** Add a dismiss/close button automatically. Only affects desktop (Dialog). Default: false. */
  showCloseButton?: boolean;
}

function ResponsiveModalFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: ResponsiveModalFooterProps) {
  const { isMobile } = use(ResponsiveModalContext);

  if (isMobile) {
    return (
      <DrawerFooter
        data-slot="responsive-modal-footer"
        className={className}
        {...props}
      >
        {children}
      </DrawerFooter>
    );
  }

  return (
    <DialogFooter
      data-slot="responsive-modal-footer"
      showCloseButton={showCloseButton}
      className={className}
      {...props}
    >
      {children}
    </DialogFooter>
  );
}

// ---------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------

function ResponsiveModalTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  const { isMobile } = use(ResponsiveModalContext);

  if (isMobile) {
    return (
      <DrawerTitle
        data-slot="responsive-modal-title"
        className={className}
        {...props}
      />
    );
  }

  return (
    <DialogTitle
      data-slot="responsive-modal-title"
      className={className}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Description
// ---------------------------------------------------------------------------

function ResponsiveModalDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  const { isMobile } = use(ResponsiveModalContext);

  if (isMobile) {
    return (
      <DrawerDescription
        data-slot="responsive-modal-description"
        className={className}
        {...props}
      />
    );
  }

  return (
    <DialogDescription
      data-slot="responsive-modal-description"
      className={className}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Close
// ---------------------------------------------------------------------------

function ResponsiveModalClose({
  ...props
}: ComponentProps<typeof DialogClose> & ComponentProps<typeof DrawerClose>) {
  const { isMobile } = use(ResponsiveModalContext);
  if (isMobile)
    return <DrawerClose data-slot="responsive-modal-close" {...props} />;
  return <DialogClose data-slot="responsive-modal-close" {...props} />;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  ResponsiveModal,
  ResponsiveModalClose,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
};
