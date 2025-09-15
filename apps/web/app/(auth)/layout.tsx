import type { FC, PropsWithChildren } from "react";

import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Iniciar sesión",
  description: "Inicia sesión en tu cuenta de PanaBarbero",
});

const AuthLayout: FC<PropsWithChildren> = ({ children }) => children;

export default AuthLayout;
