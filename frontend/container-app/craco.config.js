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
            auth:      `auth@${process.env.REACT_APP_AUTH_MF_URL || "http://localhost:3001"}/remoteEntry.js`,
            property:  `property@${process.env.REACT_APP_PROPERTY_MF_URL || "http://localhost:3031"}/remoteEntry.js`,
            residents: `residents@${process.env.REACT_APP_RESIDENTS_MF_URL || "http://localhost:3033"}/remoteEntry.js`,
            payment:   `payment@${process.env.REACT_APP_PAYMENT_MF_URL || "http://localhost:3035"}/remoteEntry.js`,
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
