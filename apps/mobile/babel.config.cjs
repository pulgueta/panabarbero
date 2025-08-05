module.exports = (api) => {
  api.cache(true);

  const plugins = [["module:react-native-dotenv"]];

  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins,
  };
};
