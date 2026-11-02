import { Redirect } from "expo-router";

/**
 * AuthSession reads the OAuth redirect in-process. This route only gives the
 * `panabarbero://auth/callback` deep link a target when the OS also delivers it
 * to the router (Android), so it never lands on the unmatched-route screen.
 */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
