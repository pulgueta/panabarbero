type RescheduleDecision = "accept" | "reject";
type RescheduleRole = "barber" | "customer";

export type WhatsAppActionId = {
  action: RescheduleDecision;
  appointmentId: string;
  role: RescheduleRole;
  type: "appointment-reschedule";
};

type TemplateComponent =
  | {
      type: "body";
      parameters: Array<{ text: string; type: "text" }>;
    }
  | {
      index: string;
      parameters: Array<{ payload: string; type: "payload" }>;
      sub_type: "quick_reply";
      type: "button";
    };

export function buildWhatsAppActionId(args: {
  action: RescheduleDecision;
  appointmentId: string;
  role: RescheduleRole;
}) {
  return `appointment-reschedule:${args.role}:${args.action}:${args.appointmentId}`;
}

export function parseWhatsAppActionId(id: string): WhatsAppActionId | null {
  const [type, role, action, appointmentId, ...extra] = id.split(":");

  if (
    type !== "appointment-reschedule" ||
    (role !== "barber" && role !== "customer") ||
    (action !== "accept" && action !== "reject") ||
    !appointmentId ||
    extra.length > 0
  ) {
    return null;
  }

  return { action, appointmentId, role, type };
}

function readReplyId(
  source: unknown,
  keys: readonly ["id"] | readonly ["payload", "text"],
): string | null {
  if (!source || typeof source !== "object") {
    return null;
  }

  const data = source as Record<string, unknown>;

  for (const key of keys) {
    const value = data[key];

    if (typeof value === "string" && value) {
      return value;
    }
  }

  return null;
}

export function getWhatsAppReplyId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as Record<string, unknown>;

  if (data.type === "interactive") {
    const interactive = data.interactive;

    if (!interactive || typeof interactive !== "object") {
      return null;
    }

    const interactiveData = interactive as Record<string, unknown>;

    if (interactiveData.type === "button_reply") {
      return readReplyId(interactiveData.button_reply, ["id"]);
    }

    if (interactiveData.type === "list_reply") {
      return readReplyId(interactiveData.list_reply, ["id"]);
    }
  }

  if (data.type === "button") {
    return readReplyId(data.button, ["payload", "text"]);
  }

  if (data.type === "button_reply") {
    return readReplyId(data.button_reply, ["id"]);
  }

  if (data.type === "list_reply") {
    return readReplyId(data.list_reply, ["id"]);
  }

  return null;
}

export function buildTextTemplateComponents(body: string): TemplateComponent[] {
  return [
    {
      type: "body",
      parameters: [{ type: "text", text: body }],
    },
  ];
}

export function buildRescheduleRequestTemplateComponents(args: {
  appointmentId: string;
  body: string;
  role: RescheduleRole;
}): TemplateComponent[] {
  return [
    ...buildTextTemplateComponents(args.body),
    {
      type: "button",
      sub_type: "quick_reply",
      index: "0",
      parameters: [
        {
          type: "payload",
          payload: buildWhatsAppActionId({
            action: "accept",
            appointmentId: args.appointmentId,
            role: args.role,
          }),
        },
      ],
    },
    {
      type: "button",
      sub_type: "quick_reply",
      index: "1",
      parameters: [
        {
          type: "payload",
          payload: buildWhatsAppActionId({
            action: "reject",
            appointmentId: args.appointmentId,
            role: args.role,
          }),
        },
      ],
    },
  ];
}
