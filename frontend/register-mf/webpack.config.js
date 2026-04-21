const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");

module.exports = {
  devServer: {
    port: 3002,
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "register",
      filename: "remoteEntry.js",
      exposes: {
        "./App": "./src/App",
      },
    }),
  ],
};
