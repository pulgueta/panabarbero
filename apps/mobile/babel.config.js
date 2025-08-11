module.exports = (api) => {
  api.cache(true);

  const plugins = [];

  return {
    presets: [
      [
        "babel-preset-expo",
        {
          jsxImportSource: "nativewind",
          "react-compiler": {
            sources: (filename) => {
              return filename.includes("./**/*");
            },
          },
        },
      ],
      "nativewind/babel",
    ],
    plugins,
  };
};
