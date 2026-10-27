import {
  inventorySaleDocumentTypes,
  inventorySalePaymentMethods,
} from "@convex/schema";
import { revalidateLogic } from "@tanstack/react-form";
import { useWebHaptics } from "web-haptics/react";
import { z } from "zod";

import { useAppForm } from "@/components/form/use-form";
import { useFormStepper } from "@/components/form/use-form-stepper";
import { saleFormDefaults } from "./types";

export const saleFormSteps = [
  { label: "Productos" },
  { label: "Pago" },
  { label: "Cliente" },
];

const documentNumberPattern = /^(?=.*[0-9A-Za-z])[0-9A-Za-z-]{3,20}$/;
/** The PhoneInput emits E.164, so a length check is enough client-side. */
const phonePattern = /^\+\d{9,15}$/;
const emailSchema = z.email();

const productsStepSchema = z.object({
  lines: z
    .array(z.object({ itemId: z.string(), quantity: z.number().int().min(1) }))
    .min(1, { error: "Agrega al menos un producto" }),
});

const paymentStepSchema = z.object({
  paymentMethod: z.enum(inventorySalePaymentMethods),
  paymentReference: z
    .string()
    .trim()
    .max(60, { error: "Máximo 60 caracteres" }),
  notes: z.string().trim().max(300, { error: "Máximo 300 caracteres" }),
});

/**
 * The customer identity is always required — it goes on the sale's receipt.
 * Only the email is optional; when present, the receipt is emailed.
 */
const customerStepSchema = z
  .object({
    customerName: z.string().trim().max(120),
    customerDocumentType: z.union([
      z.enum(inventorySaleDocumentTypes),
      z.literal(""),
    ]),
    customerDocumentNumber: z.string().trim().max(20),
    customerPhone: z.string(),
    customerEmail: z.string().trim().max(255),
  })
  .superRefine((values, ctx) => {
    const issue = (path: keyof typeof values, message: string) => {
      ctx.addIssue({ code: "custom", path: [path], message });
    };

    if (values.customerName.length < 3) {
      issue("customerName", "Ingresa el nombre del cliente");
    }

    if (!values.customerDocumentType) {
      issue("customerDocumentType", "Selecciona el tipo de documento");
    }

    if (!documentNumberPattern.test(values.customerDocumentNumber)) {
      issue("customerDocumentNumber", "Ingresa un número de documento válido");
    }

    if (!phonePattern.test(values.customerPhone)) {
      issue("customerPhone", "Ingresa un celular válido");
    }

    if (
      values.customerEmail &&
      !emailSchema.safeParse(values.customerEmail).success
    ) {
      issue("customerEmail", "Ingresa un correo válido");
    }
  });

const saleStepSchemas = [
  productsStepSchema,
  paymentStepSchema,
  customerStepSchema,
];

export function useSaleForm(onValidSubmit: () => void) {
  const haptic = useWebHaptics();

  const stepper = useFormStepper(saleStepSchemas);

  const form = useAppForm({
    onSubmitInvalid: () => {
      haptic.trigger("error");
    },
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: {
      // @ts-expect-error - the step schema is a slice of the form values
      onDynamic: stepper.currentValidator,
    },
    defaultValues: saleFormDefaults,
    onSubmit: () => {
      onValidSubmit();
    },
  });

  return { form, stepper };
}

export type SaleFormEngine = ReturnType<typeof useSaleForm>;
export type SaleForm = SaleFormEngine["form"];
