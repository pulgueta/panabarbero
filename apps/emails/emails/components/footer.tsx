import { Hr, Section, Text } from "@react-email/components";

export const Footer = () => {
  return (
    <>
      <Hr className="border-border" />

      <Section className="text-center text-muted-foreground">
        {/* <Text className="text-xs">
          Calle 61 #18a 20, Barrancabermeja, Santander, Colombia
        </Text> */}
        <Text className="text-xs">
          &copy; {new Date().getFullYear()} PanaBarbero S.A.S.
        </Text>
      </Section>
    </>
  );
};
