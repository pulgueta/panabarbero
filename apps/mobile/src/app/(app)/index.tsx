import { Redirect } from "expo-router";

/** The gated area opens on the agenda. */
export default function AppIndex() {
  return <Redirect href="/(app)/(tabs)/agenda" />;
}
