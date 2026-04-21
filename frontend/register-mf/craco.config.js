const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");
const deps = require("./package.json").dependencies;

module.exports = {
  devServer: {
    port: 3032,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.output.publicPath = "http://localhost:3032/";
      webpackConfig.output.uniqueName = "register-mf";
      return webpackConfig;
    },
    plugins: {
      add: [
        new ModuleFederationPlugin({
          name: "register",
          filename: "remoteEntry.js",
          exposes: {
            "./App": "./src/App",
          },
          shared: {
            react: {
              singleton: true,
              requiredVersion: deps.react,
            },
            "react-dom": {
              singleton: true,
              requiredVersion: deps["react-dom"],
            },
          },
        }),
      ],
    },
  },
};
