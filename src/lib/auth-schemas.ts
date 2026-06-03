import { boolean, email, object, string } from "zod";

export const loginFormSchema = object({
  email: email({ message: "El correo electrónico es requerido" })
    .min(2, "El correo electrónico es requerido")
    .max(255, "El correo electrónico no puede tener más de 255 caracteres"),
  password: string({ message: "La contraseña es requerida" })
    .min(4, "La contraseña es requerida")
    .max(255, "La contraseña no puede tener más de 255 caracteres"),
  rememberMe: boolean(),
});

export const registerFormSchema = loginFormSchema
  .omit({ rememberMe: true })
  .extend({
    name: string({ message: "El nombre y apellido es requerido" })
      .min(2, "El nombre y apellido debe tener al menos 2 caracteres")
      .max(255, "El nombre y apellido no puede tener más de 255 caracteres"),
    confirmPassword: string({
      message: "La contraseña no coincide",
    })
      .min(4, "La contraseña no coincide")
      .max(255, "La contraseña no puede tener más de 255 caracteres"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const resetPasswordSchema = object({
  token: string({ message: "El token es requerido" })
    .min(1, "El token es requerido")
    .max(255, "El token no puede tener más de 255 caracteres"),
  password: string({ message: "La contraseña es requerida" })
    .min(4, "La contraseña es requerida")
    .max(255, "La contraseña no puede tener más de 255 caracteres"),
  confirmPassword: string({
    message: "La contraseña no coincide",
  })
    .min(4, "La contraseña no coincide")
    .max(255, "La contraseña no puede tener más de 255 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = loginFormSchema.omit({
  password: true,
  rememberMe: true,
});
