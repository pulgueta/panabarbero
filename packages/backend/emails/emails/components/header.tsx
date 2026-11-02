import { Hr, Img, Section } from "react-email";

export const Header = () => {
  return (
    <Section>
      <Img
        src="https://storage.panabarbero.com/panabarbero-email.png"
        alt="PanaBarbero"
        className="w-full rounded-xl"
      />

      <Hr className="border-border" />
    </Section>
  );
};
