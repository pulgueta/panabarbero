import { Heading, Hr, Section, Text } from "@react-email/components";

export const Header = () => {
  return (
    <Section>
      <Heading className="text-balance font-bold tracking-tight">
        PanaBarbero
      </Heading>
      <Text className="text-pretty text-muted-foreground text-sm">
        La solución para las barberías.
      </Text>

      <Hr className="border-border" />
    </Section>
  );
};
