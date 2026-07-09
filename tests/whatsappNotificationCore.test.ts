import { describe, expect, test } from "vitest";

import {
  buildRescheduleRequestTemplateComponents,
  buildTextTemplateComponents,
  buildWhatsAppActionId,
  getWhatsAppReplyId,
  parseWhatsAppActionId,
} from "../convex/whatsappNotificationCore";

describe("WhatsApp appointment notification helpers", () => {
  test("encodes and decodes reschedule decision action ids", () => {
    const actionId = buildWhatsAppActionId({
      action: "accept",
      appointmentId: "appt_123",
      role: "customer",
    });

    expect(actionId).toBe("appointment-reschedule:customer:accept:appt_123");
    expect(parseWhatsAppActionId(actionId)).toEqual({
      action: "accept",
      appointmentId: "appt_123",
      role: "customer",
      type: "appointment-reschedule",
    });
  });

  test("rejects malformed or unsupported action ids", () => {
    expect(parseWhatsAppActionId("appointment-reschedule:owner:accept:123"))
      .toBeNull();
    expect(parseWhatsAppActionId("appointment-reschedule:customer:maybe:123"))
      .toBeNull();
    expect(parseWhatsAppActionId("unknown:customer:accept:123")).toBeNull();
    expect(parseWhatsAppActionId("appointment-reschedule:customer:accept"))
      .toBeNull();
  });

  test("extracts reply ids from WhatsApp interactive webhook payloads", () => {
    expect(
      getWhatsAppReplyId({
        type: "interactive",
        interactive: {
          type: "button_reply",
          button_reply: {
            id: "appointment-reschedule:barber:reject:appt_123",
            title: "Rechazar",
          },
        },
      }),
    ).toBe("appointment-reschedule:barber:reject:appt_123");

    expect(
      getWhatsAppReplyId({
        type: "interactive",
        interactive: {
          type: "list_reply",
          list_reply: {
            id: "appointment-reschedule:barber:accept:appt_123",
            title: "Aceptar",
          },
        },
      }),
    ).toBe("appointment-reschedule:barber:accept:appt_123");

    expect(
      getWhatsAppReplyId({
        type: "button",
        button: {
          payload: "appointment-reschedule:customer:accept:appt_123",
          text: "Aceptar",
        },
      }),
    ).toBe("appointment-reschedule:customer:accept:appt_123");

    expect(getWhatsAppReplyId({ type: "text", body: "Aceptar" })).toBeNull();
  });

  test("builds template body parameters", () => {
    expect(buildTextTemplateComponents("Tu cita fue actualizada.")).toEqual([
      {
        type: "body",
        parameters: [{ type: "text", text: "Tu cita fue actualizada." }],
      },
    ]);
  });

  test("builds reschedule template components with quick reply payloads", () => {
    const components = buildRescheduleRequestTemplateComponents({
      appointmentId: "appt_123",
      body: "Un cliente ha solicitado reagendar una cita.",
      role: "barber",
    });

    expect(components).toEqual([
      {
        type: "body",
        parameters: [
          { type: "text", text: "Un cliente ha solicitado reagendar una cita." },
        ],
      },
      {
        type: "button",
        sub_type: "quick_reply",
        index: "0",
        parameters: [
          {
            type: "payload",
            payload: "appointment-reschedule:barber:accept:appt_123",
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
            payload: "appointment-reschedule:barber:reject:appt_123",
          },
        ],
      },
    ]);
  });
});
