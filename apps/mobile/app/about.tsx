import { useHello } from "@panabarbero/client/hooks";
import { Link } from "expo-router";
import { View } from "react-native";

import { Text } from "@/components/ui/text";

const About = () => {
  const { data, isLoading, error } = useHello();

  return (
    <View className="flex-1 items-center justify-center">
      <Text className="font-bold text-xl">About</Text>
      <Link href="/">Go back home</Link>

      {error && <Text>{error.message}</Text>}
      <Text>{isLoading ? "Loading..." : JSON.stringify(data, null, 2)}</Text>
    </View>
  );
};
export default About;
