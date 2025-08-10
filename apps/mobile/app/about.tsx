import { Link } from "expo-router";
import { Text, View } from "react-native";

const About = () => {
  return (
    <View className="flex-1 items-center justify-center">
      <Text>About</Text>
      <Link href="/about">Go back home</Link>
    </View>
  );
};
export default About;
