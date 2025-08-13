import { APP_NAME } from "@panabarbero/constants";
import type { ConfigContext, ExpoConfig } from "expo/config";

import { version } from "./package.json";

const DEFAULT_SLUG = "panabarbero" as const;
const DEFAULT_BUNDLE_IDENTIFIER = "com.mobile.panabarbero" as const;

const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;

type Config = {
  name: string;
  packageName: string;
};

function projectConfig(): Config {
  if (process.env.EXPO_PUBLIC_APP_VARIANT === "development") {
    return {
      name: `${APP_NAME} (Development)`,
      packageName: `${DEFAULT_BUNDLE_IDENTIFIER}.dev`,
    };
  }

  return {
    name: APP_NAME,
    packageName: DEFAULT_BUNDLE_IDENTIFIER,
  };
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  name: projectConfig().name,
  slug: DEFAULT_SLUG,
  owner: "pulgueta",
  version,
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: DEFAULT_SLUG,
  userInterfaceStyle: "automatic",
  assetBundlePatterns: ["**/*"],
  ios: {
    ...config.ios,
    bundleIdentifier: projectConfig().packageName,
    usesAppleSignIn: true,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_PLIST ?? "./GoogleService-Info.plist",
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      NSFaceIDUsageDescription:
        "Usamos Face ID para autenticarte de forma segura y automática.",
      LSMinimumSystemVersion: "12.0",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    package: projectConfig().packageName,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
  },
  notification: {
    iosDisplayInForeground: true,
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId,
    },
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    url: `https://u.expo.dev/${projectId}`,
  },
});
