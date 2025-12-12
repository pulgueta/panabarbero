import { Hr, Img, Section } from "@react-email/components";

export const Header = () => {
  return (
    <Section>
      <Img
        src="https://storage.panabarbero.com/panabarbero-og.png"
        alt="PanaBarbero"
        className="w-full rounded-xl"
      />

      <Hr className="border-border" />
    </Section>
  );
};
