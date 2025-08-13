import { useHello } from "@panabarbero/client/hooks";
import { View } from "react-native";

import { Link } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

const Index = () => {
  const { data, isLoading, error } = useHello();

  return (
    <View className="flex-1 items-center justify-center gap-4">
      {error && <Text>{error.message}</Text>}
      <Text>{isLoading ? "Loading..." : JSON.stringify(data, null, 2)}</Text>
      <Link href="/about">
        <Text>About</Text>
      </Link>
    </View>
  );
};
export default Index;
