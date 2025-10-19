import { ThemeToggler } from "@/components/layout/theme-toggler";
import { useTheme } from "@/components/theme";
import { Separator } from "@/components/ui/separator";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  beforeLoad: () => {
    const isMobile = window.innerWidth <= 768;

    if (!isMobile) {
      throw redirect({
        to: "/",
        replace: true,
      });
    }
  },
});

function SettingsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const isSystem = theme === "system";

  const themeName = isSystem ? "Sistema" : isDark ? "Oscuro" : "Claro";

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-bold text-3xl">Ajustes</h1>

      <Separator className="my-4" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <p className="text-pretty font-semibold text-lg">
            Tema: <span className="font-normal">{themeName}</span>
          </p>

          <div className="flex items-center gap-2">
            <ThemeToggler />
          </div>
        </div>
      </div>
    </div>
  );
}
