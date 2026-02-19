import { Link } from "@tanstack/react-router";

export const FormHeader = () => {
  return (
    <Link
      to="/"
      className="flex items-center gap-2 self-center font-semibold text-xl tracking-tighter"
      style={{ viewTransitionName: "logo" }}
    >
      PanaBarbero
    </Link>
  );
};
