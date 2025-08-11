import { View } from "react-native";

import { Button, Link } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

const Index = () => {
  return (
    <View className="flex-1 items-center justify-center gap-4">
      <Button>
        <Text>Click me</Text>
      </Button>
      <Link href="/about">
        <Text>About</Text>
      </Link>
    </View>
  );
};
export default Index;
