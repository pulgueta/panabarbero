import { describe, expect, test } from "vitest";

import {
  buildCloseoutActionId,
  buildInventoryAckActionId,
  buildOnMyWayActionId,
  buildRescheduleActionId,
  buildReviewInviteActionId,
  buildReviewRateActionId,
  getWhatsAppReplyId,
  parseWhatsAppActionId,
} from "../convex/whatsappCore";
import {
  buildAppointmentCancelled,
  buildInventoryLowStock,
  buildRescheduleRequest,
  filterButtonsToTemplate,
} from "../convex/whatsappTemplates";

describe("WhatsApp action-id codec", () => {
  test("round-trips reschedule decision ids", () => {
    const id = buildRescheduleActionId({
      action: "accept",
      appointmentId: "appt_123",
      proposedAt: 1783717200000,
      role: "customer",
    });

    expect(id).toBe(
      "appointment-reschedule:customer:accept:appt_123:1783717200000",
    );
    expect(parseWhatsAppActionId(id)).toEqual({
      type: "appointment-reschedule",
      role: "customer",
      action: "accept",
      appointmentId: "appt_123",
      proposedAt: 1783717200000,
    });
  });

  test("round-trips inventory ack ids", () => {
    const id = buildInventoryAckActionId({
      levelId: "level_9",
      alertedAt: 1783717200000,
    });

    expect(id).toBe("inventory-ack:level_9:1783717200000");
    expect(parseWhatsAppActionId(id)).toEqual({
      type: "inventory-ack",
      levelId: "level_9",
      alertedAt: 1783717200000,
    });
  });

  test("round-trips on-my-way and closeout ids", () => {
    expect(
      parseWhatsAppActionId(
        buildOnMyWayActionId({ appointmentId: "a1", date: 7 }),
      ),
    ).toEqual({ type: "appointment-omw", appointmentId: "a1", date: 7 });

    expect(
      parseWhatsAppActionId(
        buildCloseoutActionId({
          action: "no-show",
          appointmentId: "a1",
          date: 5,
        }),
      ),
    ).toEqual({
      type: "appointment-closeout",
      action: "no-show",
      appointmentId: "a1",
      date: 5,
    });
  });

  test("round-trips review invite and rating ids", () => {
    expect(
      parseWhatsAppActionId(buildReviewInviteActionId({ appointmentId: "a1" })),
    ).toEqual({ type: "review-invite", appointmentId: "a1" });

    expect(
      parseWhatsAppActionId(
        buildReviewRateActionId({ appointmentId: "a1", rating: 5 }),
      ),
    ).toEqual({ type: "review-rate", appointmentId: "a1", rating: 5 });
  });

  test("rejects malformed or unsupported action ids", () => {
    const cases = [
      "appointment-reschedule:owner:accept:appt:1", // bad role
      "appointment-reschedule:customer:maybe:appt:1", // bad action
      "unknown:customer:accept:appt:1", // bad type
      "appointment-reschedule:customer:accept", // too few segments
      "appointment-reschedule:customer:accept:appt", // missing proposedAt
      "appointment-reschedule:customer:accept:appt:abc", // non-numeric
      "appointment-reschedule:customer:accept:appt:1:extra", // extra segment
      "inventory-ack:level", // missing alertedAt
      "inventory-ack:level:abc", // non-numeric alertedAt
      "appointment-closeout:done:a1:5", // bad closeout action
      "appointment-omw:a1", // missing date binding
      "review-rate:a1:0", // rating below range
      "review-rate:a1:6", // rating above range
      "review-rate:a1:4.5", // non-integer rating
      "review-invite:a1:extra", // extra segment
      "", // empty
    ];

    for (const id of cases) {
      expect(parseWhatsAppActionId(id)).toBeNull();
    }
  });
});

describe("inbound reply-id extraction", () => {
  const id = "appointment-reschedule:customer:accept:appt_123:1783717200000";

  test("nested interactive button_reply", () => {
    expect(
      getWhatsAppReplyId({
        type: "interactive",
        interactive: { type: "button_reply", button_reply: { id } },
      }),
    ).toBe(id);
  });

  test("nested interactive list_reply", () => {
    expect(
      getWhatsAppReplyId({
        type: "interactive",
        interactive: { type: "list_reply", list_reply: { id } },
      }),
    ).toBe(id);
  });

  test("flat button payload (template quick reply)", () => {
    expect(
      getWhatsAppReplyId({
        type: "button",
        button: { payload: id, text: "Aceptar cambio" },
      }),
    ).toBe(id);
  });

  test("flat button_reply / list_reply", () => {
    expect(getWhatsAppReplyId({ type: "button_reply", button_reply: { id } })).toBe(
      id,
    );
    expect(getWhatsAppReplyId({ type: "list_reply", list_reply: { id } })).toBe(
      id,
    );
  });

  test("free text yields null", () => {
    expect(getWhatsAppReplyId({ type: "text", body: "hola" })).toBeNull();
    expect(getWhatsAppReplyId(null)).toBeNull();
    expect(getWhatsAppReplyId("x")).toBeNull();
  });
});

// The component stores `payload = msg[msg.type]`, so the handler sees the
// inner object, not the webhook envelope.
describe("stored component payloads", () => {
  const id = "appointment-reschedule:customer:accept:appt_123:1783717200000";

  test("template quick reply (stored as type text, payload = msg.button)", () => {
    expect(getWhatsAppReplyId({ payload: id, text: "Aceptar cambio" })).toBe(
      id,
    );
  });

  test("interactive list reply (payload = msg.interactive)", () => {
    expect(
      getWhatsAppReplyId({ type: "list_reply", list_reply: { id } }),
    ).toBe(id);
  });

  test("interactive button reply (payload = msg.interactive)", () => {
    expect(
      getWhatsAppReplyId({ type: "button_reply", button_reply: { id } }),
    ).toBe(id);
  });

  test("free text (payload = msg.text) yields null", () => {
    expect(getWhatsAppReplyId({ body: "hola" })).toBeNull();
  });
});

describe("template builders", () => {
  test("reschedule request emits body + accept/reject quick replies at 1/2", () => {
    const send = buildRescheduleRequest({
      role: "barber",
      receiverName: "Nico",
      barbershopName: "El Pana",
      oldDate: "12 de agosto",
      oldTime: "3:00 p. m.",
      newDate: "13 de agosto",
      newTime: "4:00 p. m.",
      appointmentId: "appt_1",
      proposedAt: 99,
    });

    expect(send.name).toBe("appointment_reschedule_request_barber");
    expect(send.components[0]).toEqual({
      type: "body",
      parameters: [
        { type: "text", text: "Nico" },
        { type: "text", text: "El Pana" },
        { type: "text", text: "12 de agosto" },
        { type: "text", text: "3:00 p. m." },
        { type: "text", text: "13 de agosto" },
        { type: "text", text: "4:00 p. m." },
      ],
    });
    expect(send.components[1]).toEqual({
      type: "button",
      sub_type: "quick_reply",
      index: "1",
      parameters: [
        {
          type: "payload",
          payload: "appointment-reschedule:barber:accept:appt_1:99",
        },
      ],
    });
    expect(send.components[2]).toEqual({
      type: "button",
      sub_type: "quick_reply",
      index: "2",
      parameters: [
        {
          type: "payload",
          payload: "appointment-reschedule:barber:reject:appt_1:99",
        },
      ],
    });
  });

  test("cancelled template carries the header shop param", () => {
    const send = buildAppointmentCancelled({
      receiverName: "Ana",
      barbershopName: "El Pana",
      reason: "Sin motivo.",
    });

    expect(send.components[0]).toEqual({
      type: "header",
      parameters: [{ type: "text", text: "El Pana" }],
    });
  });

  test("low-stock template binds the ack payload to the alert stamp", () => {
    const send = buildInventoryLowStock({
      itemName: "Cera",
      barbershopName: "El Pana",
      remaining: 2,
      unitLabel: "unidades",
      reorderPoint: 5,
      levelId: "level_1",
      alertedAt: 77,
    });

    expect(send.components[1]).toEqual({
      type: "button",
      sub_type: "quick_reply",
      index: "1",
      parameters: [{ type: "payload", payload: "inventory-ack:level_1:77" }],
    });
  });

  test("filterButtonsToTemplate drops quick replies the template lacks", () => {
    const send = buildRescheduleRequest({
      role: "customer",
      receiverName: "Ana",
      barbershopName: "El Pana",
      oldDate: "12 de agosto",
      oldTime: "3:00 p. m.",
      newDate: "13 de agosto",
      newTime: "4:00 p. m.",
      appointmentId: "appt_1",
      proposedAt: 99,
    });

    // Pre-batch synced shape: CTA(0) + Aceptar(1), no Rechazar at index 2.
    const preBatch = [
      { type: "BODY", text: "..." },
      {
        type: "BUTTONS",
        buttons: [
          { type: "URL", text: "Revisar cambio" },
          { type: "QUICK_REPLY", text: "Aceptar cambio" },
        ],
      },
    ];

    const filtered = filterButtonsToTemplate(send.components, preBatch);

    expect(filtered).toHaveLength(2); // body + accept only
    expect(
      filtered.filter((component) => component.type === "button"),
    ).toHaveLength(1);

    // Post-batch shape keeps both quick replies.
    const postBatch = [
      { type: "BODY", text: "..." },
      {
        type: "BUTTONS",
        buttons: [
          { type: "URL", text: "Revisar cambio" },
          { type: "QUICK_REPLY", text: "Aceptar cambio" },
          { type: "QUICK_REPLY", text: "Rechazar cambio" },
        ],
      },
    ];

    expect(filterButtonsToTemplate(send.components, postBatch)).toHaveLength(3);

    // Unrecognizable synced shape fails open.
    expect(filterButtonsToTemplate(send.components, undefined)).toHaveLength(3);
  });

  test("params are sanitized (no newlines or repeated spaces)", () => {
    const send = buildAppointmentCancelled({
      receiverName: "Ana\nMaría",
      barbershopName: "El  Pana",
      reason: " motivo\tlargo ",
    });

    expect(send.components[1]).toEqual({
      type: "body",
      parameters: [
        { type: "text", text: "Ana María" },
        { type: "text", text: "El Pana" },
        { type: "text", text: "motivo largo" },
      ],
    });
  });
});
