const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");
const deps = require("./package.json").dependencies;

module.exports = {
  devServer: {
    port: 3000,
  },
  webpack: {
    plugins: {
      add: [
        new ModuleFederationPlugin({
          name: "container",
          remotes: {
            auth: "auth@http://localhost:3001/remoteEntry.js",
            property: "property@http://localhost:3031/remoteEntry.js",
            residents: "residents@http://localhost:3033/remoteEntry.js",
            payment: "payment@http://localhost:3035/remoteEntry.js",
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
