import { email, object, string } from "zod";

export const loginFormSchema = object({
  email: email({ message: "El correo electrónico es requerido" })
    .min(4, "El correo electrónico es requerido")
    .max(255, "El correo electrónico no puede tener más de 255 caracteres"),
  password: string({ message: "La contraseña es requerida" })
    .min(4, "La contraseña es requerida")
    .max(255, "La contraseña no puede tener más de 255 caracteres"),
});

export const registerFormSchema = object({
  name: string({ message: "El nombre es requerido" })
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(255, "El nombre no puede tener más de 255 caracteres"),
  email: email({ message: "El correo electrónico es requerido" })
    .min(4, "El correo electrónico es requerido")
    .max(255, "El correo electrónico no puede tener más de 255 caracteres"),
  password: string({ message: "La contraseña es requerida" })
    .min(4, "La contraseña debe tener al menos 4 caracteres")
    .max(255, "La contraseña no puede tener más de 255 caracteres"),
});
