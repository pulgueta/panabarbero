import { useHello } from "@panabarbero/client/hooks";
import { View } from "react-native";

import { Link } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

const Index = () => {
  const { data, isLoading } = useHello();

  return (
    <View className="flex-1 items-center justify-center gap-4">
      <Text>{isLoading ? "Loading..." : data?.message}</Text>
      <Link href="/about">
        <Text>About</Text>
      </Link>
    </View>
  );
};
export default Index;
