import { Hr, Section, Text } from "@react-email/components";

const CURRENT_YEAR = new Date().getFullYear();

export const Footer = () => {
  return (
    <>
      <Hr className="border-border" />

      <Section className="text-center text-muted-foreground">
        {/* <Text className="text-xs">
          Calle 61 #18a 20, Barrancabermeja, Santander, Colombia
        </Text> */}
        <Text className="text-xs">
          &copy; {CURRENT_YEAR} PanaBarbero S.A.S.
        </Text>
      </Section>
    </>
  );
};
