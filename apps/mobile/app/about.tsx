import { Link } from "expo-router";
import { View } from "react-native";

import { Text } from "@/components/ui/text";

const About = () => {
  return (
    <View className="flex-1 items-center justify-center">
      <Text className="font-bold text-xl">About</Text>
      <Link href="/">Go back home</Link>
    </View>
  );
};
export default About;
