const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");

module.exports = {
  devServer: {
    port: 3000,
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "container",
      remotes: {
        auth: "auth@http://localhost:3001/remoteEntry.js",
        payment: "payment@http://localhost:3035/remoteEntry.js",
      },
    }),
  ],
};
