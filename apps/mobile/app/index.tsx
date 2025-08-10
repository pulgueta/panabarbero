import { Link } from "expo-router";
import { Text, View } from "react-native";

const Index = () => {
  return (
    <View className="flex-1 items-center justify-center">
      <Text className="font-bold text-3xl">Index</Text>
      <Link href="/about">About</Link>
    </View>
  );
};
export default Index;
