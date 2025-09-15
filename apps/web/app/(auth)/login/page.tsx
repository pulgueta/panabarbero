import { LoginForm } from "@/components/auth/login-form";
import { Container } from "@/components/ui/container";
import { Heading, Paragraph } from "@/components/ui/typography";

const Login = () => {
  return (
    <Container
      as="main"
      className="flex min-h-dvh items-center justify-center p-4"
      fullWidth
    >
      <Container
        className="flex flex-col items-center gap-2 border p-4"
        rounded="xl"
        variant="sm"
      >
        <Container className="flex flex-col gap-1 p-4">
          <Heading>Iniciar sesión</Heading>
          <Paragraph muted>
            Utiliza tu cuenta preferida o biometría para iniciar sesión.
          </Paragraph>
        </Container>
        <LoginForm />
      </Container>
    </Container>
  );
};

export default Login;
