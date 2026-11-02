import {
  CaretDownIcon,
  CheckCircleIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import type { ComponentProps, ReactNode } from "react";
import { isValidElement } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getToolDisplayName } from "@/lib/tool-names";
import { cn } from "@/lib/utils";

function humanizeKey(key: string): string {
  const spaced = key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatToolValue(value: unknown, depth = 0): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value))
    return value.map((item) => formatToolValue(item, depth)).join(", ");
  if (typeof value === "object" && depth < 4) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "—";
    return entries
      .map(([k, v]) => `${humanizeKey(k)}: ${formatToolValue(v, depth + 1)}`)
      .join("\n");
  }
  return String(value);
}

const ToolDetailText = ({
  text,
  className,
}: {
  text: string;
  className?: string;
}) => (
  <div
    className={cn(
      "overflow-x-auto whitespace-pre-wrap p-4 text-sm leading-relaxed",
      className,
    )}
  >
    {text}
  </div>
);

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => {
  const isDev = import.meta.env.DEV;

  return (
    <Collapsible
      className={cn(
        "group not-prose mb-2 w-full",
        {
          "rounded-lg border bg-card": isDev,
        },
        className,
      )}
      {...props}
    />
  );
};

export type ToolPart = ToolUIPart | DynamicToolUIPart;

export type ToolHeaderProps = {
  title?: string;
  className?: string;
} & (
  | { type: ToolUIPart["type"]; state: ToolUIPart["state"]; toolName?: never }
  | {
      type: DynamicToolUIPart["type"];
      state: DynamicToolUIPart["state"];
      toolName: string;
    }
);

const statusLabels: Record<ToolPart["state"], string> = {
  "approval-requested": "Esperando aprobación",
  "approval-responded": "Aprobado",
  "input-available": "Ejecutando",
  "input-streaming": "Procesando",
  "output-available": "Completado",
  "output-denied": "Denegado",
  "output-error": "Error",
};

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "warning"
  | "success"
  | "info"
  | "outline"
  | "ghost"
  | "link";

const statusVariants: Record<ToolPart["state"], BadgeVariant> = {
  "approval-requested": "warning",
  "approval-responded": "info",
  "input-available": "warning",
  "input-streaming": "secondary",
  "output-available": "success",
  "output-denied": "warning",
  "output-error": "destructive",
};

const statusIcons: Record<ToolPart["state"], ReactNode> = {
  "approval-requested": (
    <ClockIcon aria-hidden className="size-3" weight="bold" />
  ),
  "approval-responded": (
    <CheckCircleIcon aria-hidden className="size-3" weight="bold" />
  ),
  "input-available": (
    <ClockIcon aria-hidden className="size-3 animate-pulse" weight="bold" />
  ),
  "input-streaming": (
    <CircleIcon aria-hidden className="size-3 animate-pulse" weight="bold" />
  ),
  "output-available": (
    <CheckCircleIcon aria-hidden className="size-3" weight="bold" />
  ),
  "output-denied": <XCircleIcon aria-hidden className="size-3" weight="bold" />,
  "output-error": <XCircleIcon aria-hidden className="size-3" weight="bold" />,
};

const getStatusBadge = (status: ToolPart["state"]) => (
  <Badge
    className="gap-1 rounded-full text-xs"
    variant={statusVariants[status]}
  >
    {statusIcons[status]}
    {statusLabels[status]}
  </Badge>
);

function deriveName(type: ToolPart["type"], toolName?: string): string {
  const rawName =
    type === "dynamic-tool"
      ? (toolName ?? "")
      : type.split("-").slice(1).join("-");
  return getToolDisplayName(rawName) || rawName;
}

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  toolName,
  ...props
}: ToolHeaderProps) => {
  const displayName = title ?? deriveName(type, toolName);
  const isDev = import.meta.env.DEV;

  if (!isDev) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-muted-foreground text-sm",
          className,
          {
            "px-3 py-2": isDev,
          },
        )}
        {...(props as ComponentProps<"div">)}
      >
        <WrenchIcon aria-hidden className="size-4 shrink-0" weight="bold" />
        <span className="font-medium text-muted-foreground">{displayName}</span>
        {getStatusBadge(state)}
      </div>
    );
  }

  return (
    <CollapsibleTrigger
      className={cn(
        "flex w-full items-center justify-between gap-4 px-3 py-2.5",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <WrenchIcon
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
          weight="bold"
        />
        <span className="font-medium text-sm">{displayName}</span>
        {getStatusBadge(state)}
      </div>
      <CaretDownIcon
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
        weight="bold"
      />
    </CollapsibleTrigger>
  );
};

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 space-y-3 border-t p-4 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className,
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolPart["input"];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn("space-y-1.5 overflow-hidden", className)} {...props}>
    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      Detalles
    </h4>
    <div className="rounded-md bg-muted/50">
      <ToolDetailText text={formatToolValue(input)} />
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ToolPart["output"];
  errorText: ToolPart["errorText"];
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) return null;

  let Output = <div>{output as ReactNode}</div>;

  if (typeof output === "object" && !isValidElement(output)) {
    Output = <ToolDetailText text={formatToolValue(output)} />;
  } else if (typeof output === "string") {
    Output = <ToolDetailText text={output} />;
  }

  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {errorText ? "Ocurrió un error" : "Resultado"}
      </h4>
      <div
        className={cn(
          "overflow-x-auto rounded-md text-sm [&_table]:w-full",
          errorText
            ? "bg-destructive/10 text-destructive"
            : "bg-muted/50 text-foreground",
        )}
      >
        {errorText && <ToolDetailText text={errorText} />}
        {Output}
      </div>
    </div>
  );
};
