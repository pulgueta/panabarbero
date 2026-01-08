/** biome-ignore-all lint/correctness/useUniqueElementIds: not needed */

import { signIn } from "@panabarbero/convex/auth";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

import { FormHeader } from "@/components/auth/form-header";
import { LoginForm } from "@/components/auth/login-form";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup, FieldSeparator } from "@/components/ui/field";

export const Route = createFileRoute("/_auth/login")({
  component: LoginPage,
  pendingComponent: LoadingComponent,
});

type Provider = "google" | "apple" | "passkey" | "facebook";

function LoginPage() {
  const router = useRouter();

  const handleSignIn = async (provider: Provider) => {
    if (provider === "passkey") {
      await signIn.passkey({
        autoFill: true,
      });
    } else {
      const { error } = await signIn.social({
        provider,
        fetchOptions: {
          onSuccess: () => {
            router.navigate({
              to: "/profile",
              search: { tab: "account" },
              replace: true,
            });
          },
          onError: ({ error }) => {
            toast.error(error.message ?? "Error al iniciar sesión");
          },
        },
      });

      if (error) {
        toast.error(error.message ?? "Error al iniciar sesión");
        return;
      }
    }
  };

  return (
    <BorderContainer className="flex flex-col items-center justify-center gap-4">
      <FormHeader />

      <div className="flex w-full max-w-xl flex-col gap-4 [view-transition-name:main-content]">
        <Card className="w-full max-w-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl tracking-tight">
              Iniciar sesión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => handleSignIn("google")}
                >
                  <GoogleIcon />
                  Iniciar sesión con Google
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => handleSignIn("facebook")}
                >
                  <FacebookIcon />
                  Iniciar sesión con Facebook
                </Button>
              </div>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card" />

              <LoginForm />

              <p className="text-center text-muted-foreground text-sm">
                ¿No tienes una cuenta?{" "}
                <Link
                  to="/register"
                  viewTransition={{ types: ["warp-in"] }}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Regístrate
                </Link>
              </p>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
    </BorderContainer>
  );
}

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <title>Iniciar sesión con Google</title>
    <defs>
      <radialGradient
        id="prefix__b"
        cx="1.479"
        cy="12.788"
        fx="1.479"
        fy="12.788"
        r="9.655"
        gradientTransform="matrix(.8032 0 0 1.0842 2.459 -.293)"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset=".368" stop-color="#ffcf09" />
        <stop offset=".718" stop-color="#ffcf09" stop-opacity=".7" />
        <stop offset="1" stop-color="#ffcf09" stop-opacity="0" />
      </radialGradient>
      <radialGradient
        id="prefix__c"
        cx="14.295"
        cy="23.291"
        fx="14.295"
        fy="23.291"
        r="11.878"
        gradientTransform="matrix(1.3272 0 0 1.0073 -3.434 -.672)"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset=".383" stop-color="#34a853" />
        <stop offset=".706" stop-color="#34a853" stop-opacity=".7" />
        <stop offset="1" stop-color="#34a853" stop-opacity="0" />
      </radialGradient>
      <linearGradient
        id="prefix__d"
        x1="23.558"
        y1="6.286"
        x2="12.148"
        y2="20.299"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset=".671" stop-color="#4285f4" />
        <stop offset=".885" stop-color="#4285f4" stop-opacity="0" />
      </linearGradient>
      <clipPath id="prefix__a">
        <path
          d="M22.36 10H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53h-.013l.013-.01c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09c.87-2.6 3.3-4.53 6.16-4.53 1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07 1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93v.01C3.99 20.53 7.7 23 12 23c2.97 0 5.46-.98 7.28-2.66 2.08-1.92 3.28-4.74 3.28-8.09 0-.78-.07-1.53-.2-2.25z"
          fill="none"
        />
      </clipPath>
    </defs>
    <path
      d="M22.36 10H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53h-.013l.013-.01c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09c.87-2.6 3.3-4.53 6.16-4.53 1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07 1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93v.01C3.99 20.53 7.7 23 12 23c2.97 0 5.46-.98 7.28-2.66 2.08-1.92 3.28-4.74 3.28-8.09 0-.78-.07-1.53-.2-2.25z"
      fill="#fc4c53"
    />
    <g clip-path="url(#prefix__a)">
      <ellipse
        cx="3.646"
        cy="13.572"
        rx="7.755"
        ry="10.469"
        fill="url(#prefix__b)"
      />
      <ellipse
        cx="15.538"
        cy="22.789"
        rx="15.765"
        ry="11.965"
        transform="rotate(-7.12 15.539 22.789)"
        fill="url(#prefix__c)"
      />
      <path
        fill="url(#prefix__d)"
        d="M11.105 8.28l.491 5.596.623 3.747 7.362 6.848 8.607-15.897-17.083-.294z"
      />
    </g>
  </svg>
);

const FacebookIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    shape-rendering="geometricPrecision"
    text-rendering="geometricPrecision"
    image-rendering="optimizeQuality"
    fill-rule="evenodd"
    clip-rule="evenodd"
    viewBox="0 0 509 509"
  >
    <title>Iniciar sesión con Facebook</title>
    <g fill-rule="nonzero">
      <path
        fill="#0866FF"
        d="M509 254.5C509 113.94 395.06 0 254.5 0S0 113.94 0 254.5C0 373.86 82.17 474 193.02 501.51V332.27h-52.48V254.5h52.48v-33.51c0-86.63 39.2-126.78 124.24-126.78 16.13 0 43.95 3.17 55.33 6.33v70.5c-6.01-.63-16.44-.95-29.4-.95-41.73 0-57.86 15.81-57.86 56.91v27.5h83.13l-14.28 77.77h-68.85v174.87C411.35 491.92 509 384.62 509 254.5z"
      />
      <path
        fill="#fff"
        d="M354.18 332.27l14.28-77.77h-83.13V227c0-41.1 16.13-56.91 57.86-56.91 12.96 0 23.39.32 29.4.95v-70.5c-11.38-3.16-39.2-6.33-55.33-6.33-85.04 0-124.24 40.16-124.24 126.78v33.51h-52.48v77.77h52.48v169.24c19.69 4.88 40.28 7.49 61.48 7.49 10.44 0 20.72-.64 30.83-1.86V332.27h68.85z"
      />
    </g>
  </svg>
);
