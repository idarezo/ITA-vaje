const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");
const deps = require("./package.json").dependencies;

module.exports = {
  devServer: {
    port: 3001,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.output.publicPath = "http://localhost:3001/";
      webpackConfig.output.uniqueName = "auth-mf";
      return webpackConfig;
    },
    plugins: {
      add: [
        new ModuleFederationPlugin({
          name: "auth",
          filename: "remoteEntry.js",
          exposes: {
            "./App": "./src/App",
            "./Login": "./src/Login/Login",
            "./Register": "./src/Register/Register",
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
            "react-router-dom": {
              singleton: true,
              requiredVersion: deps["react-router-dom"],
            },
          },
        }),
      ],
    },
  },
};
