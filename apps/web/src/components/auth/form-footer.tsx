import { Link } from "@tanstack/react-router";
import type { FC } from "react";

import { CardFooter } from "@/components/ui/card";

export const FormFooter: FC = () => {
  return (
    <CardFooter className="justify-center px-4">
      <p className="text-center font-normal text-muted-foreground text-xs [&_a]:underline-offset-4 [&_a]:hover:underline">
        Al crear una cuenta, aceptas los{" "}
        <Link to="/tos">Términos de Servicio</Link> y{" "}
        <Link to="/privacy-policy">Política de Privacidad</Link>.
      </p>
    </CardFooter>
  );
};
