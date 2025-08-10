import { Link } from "expo-router";
import { View } from "react-native";

import { Button, buttonTextVariants } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

const Index = () => {
  const variant = "secondary";

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-secondary">
      <Button>
        <Text className={buttonTextVariants()}>Click me</Text>
      </Button>
      <Button variant={variant}>
        <Link href="/about" asChild>
          <Text className={buttonTextVariants({ variant })}>About</Text>
        </Link>
      </Button>
    </View>
  );
};
export default Index;
