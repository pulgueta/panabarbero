import { DeviceMobileIcon, MonitorIcon } from "@phosphor-icons/react";
import { type FC, type PropsWithChildren, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FormPageSlotProps extends PropsWithChildren {
  className?: string;
}

/**
 * Layout primitives for forms that live on their own page (per DESIGN.md §9:
 * > 6 fields, growable, or multi-section → dedicated page). The page still uses
 * `DashboardPage` for its title + actions; `FormPageBody` splits the work area
 * into a fields column and a sticky live-preview panel.
 *
 * The shared state IS the TanStack Form instance (`useAppForm`) — pass it to the
 * fields and subscribe to it inside the preview (`form.Subscribe` /
 * `useStore(form.store)`), so the preview mirrors what's being typed without any
 * extra provider.
 *
 * ```tsx
 * <DashboardPage>
 *   <DashboardPageHeader>
 *     <DashboardPageHeading title="Nuevo producto" description="…" />
 *   </DashboardPageHeader>
 *   <FormPageBody>
 *     <FormPageFields>
 *       <FormPageSection title="Datos" description="…">…campos…</FormPageSection>
 *       <FormPageFooter>…Cancelar / Guardar…</FormPageFooter>
 *     </FormPageFields>
 *     <FormPagePreview>
 *       <form.Subscribe selector={(s) => s.values}>{(v) => <ProductCard {...v} />}</form.Subscribe>
 *     </FormPagePreview>
 *   </FormPageBody>
 * </DashboardPage>
 * ```
 */
export const FormPageBody: FC<FormPageSlotProps> = ({
  children,
  className,
}) => {
  return (
    <div
      data-slot="form-page-body"
      className={cn(
        "grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]",
        className,
      )}
    >
      {children}
    </div>
  );
};

/** Left column: the form fields, capped for readable line length. */
export const FormPageFields: FC<FormPageSlotProps> = ({
  children,
  className,
}) => {
  return (
    <div
      data-slot="form-page-fields"
      className={cn("min-w-0 max-w-2xl space-y-8 pb-20 sm:pb-0", className)}
    >
      {children}
    </div>
  );
};

interface FormPageSectionProps extends FormPageSlotProps {
  title: string;
  description?: string;
}

/** A labeled group inside a long form — keeps a dedicated-page form well distributed. */
export const FormPageSection: FC<FormPageSectionProps> = ({
  title,
  description,
  children,
  className,
}) => {
  return (
    <section
      data-slot="form-page-section"
      className={cn("space-y-4", className)}
    >
      <div className="space-y-1">
        <h2 className="font-semibold text-base tracking-tight">{title}</h2>
        {description ? (
          <p className="text-pretty text-muted-foreground text-sm">
            {description}
          </p>
        ) : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
};

/** Sticky action bar at the end of the fields column (Cancelar / Guardar). */
export const FormPageFooter: FC<FormPageSlotProps> = ({
  children,
  className,
}) => {
  return (
    <div
      data-slot="form-page-footer"
      className={cn(
        "sticky bottom-0 -mx-4 flex flex-col-reverse items-stretch gap-2 border-t bg-card/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-card/80 sm:mx-0 sm:flex-row sm:items-center sm:justify-end sm:rounded-b-xl max-sm:[&_*]:w-full",
        className,
      )}
    >
      {children}
    </div>
  );
};

interface FormPagePreviewProps extends FormPageSlotProps {
  title?: string;
}

/**
 * Right column: a sticky preview of the entity being created/edited, with a
 * width toggle so the author can see the result at phone vs full width
 * ("responsive previews"). On mobile it drops below the fields.
 */
export const FormPagePreview: FC<FormPagePreviewProps> = ({
  title = "Vista previa",
  children,
  className,
}) => {
  const [width, setWidth] = useState<"mobile" | "full">("full");

  return (
    <aside
      data-slot="form-page-preview"
      className={cn("lg:sticky lg:top-6 lg:self-start", className)}
    >
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <span className="font-medium text-muted-foreground text-sm">
            {title}
          </span>
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant={width === "mobile" ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label="Vista móvil"
              aria-pressed={width === "mobile"}
              onClick={() => setWidth("mobile")}
            >
              <DeviceMobileIcon />
            </Button>
            <Button
              type="button"
              variant={width === "full" ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label="Vista completa"
              aria-pressed={width === "full"}
              onClick={() => setWidth("full")}
            >
              <MonitorIcon />
            </Button>
          </div>
        </div>
        <div className="bg-muted/30 p-4">
          <div
            className={cn(
              "mx-auto transition-[max-width] duration-200 ease-out",
              width === "mobile" ? "max-w-[20rem]" : "max-w-full",
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </aside>
  );
};

/** Support column for page forms that need operational context but no live preview. */
export const FormPageAside: FC<FormPageSlotProps> = ({
  children,
  className,
}) => {
  return (
    <aside
      data-slot="form-page-aside"
      className={cn("space-y-4 lg:sticky lg:top-6 lg:self-start", className)}
    >
      {children}
    </aside>
  );
};
