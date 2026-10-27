import { FacebookLogoIcon, InstagramLogoIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type { FC } from "react";

const currentYear = new Date().getFullYear();

const socialLinks = [
  {
    label: "Instagram",
    href: "https://dub.sh/z11b1Xb",
    icon: <InstagramLogoIcon weight="bold" className="size-4" />,
  },
  {
    label: "Facebook",
    href: "https://dub.sh/f48mIt9",
    icon: <FacebookLogoIcon weight="bold" className="size-4" />,
  },
];

const footerLinks = [
  { label: "Política de privacidad", to: "/privacy-policy" as const },
  { label: "Términos de servicio", to: "/tos" as const },
  { label: "Precios", to: "/pricing" as const },
  { label: "Pana IA", to: "/ai" as const },
];

export const LandingFooter: FC = () => {
  return (
    <footer className="mt-4 border-border/50 border-t pt-8">
      <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <span className="font-bold text-xl tracking-tight">PanaBarbero</span>
          <span className="text-muted-foreground text-xs">
            &copy; {currentYear} PanaBarbero. Todos los derechos reservados.
          </span>
        </div>

        <nav className="flex items-center gap-4" aria-label="Enlaces">
          {footerLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-muted-foreground text-xs transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Social links */}
        <div className="flex items-center gap-3">
          {socialLinks.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {social.icon}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};
