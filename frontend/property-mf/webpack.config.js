const { ModuleFederationPlugin } = require("webpack").container;
const { VueLoaderPlugin } = require("vue-loader");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
const path = require("path");

const PUBLIC_PATH = process.env.PUBLIC_PATH || "http://localhost:3031/";
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:4000";

module.exports = {
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    publicPath: PUBLIC_PATH,
    uniqueName: "property-mf",
  },
  devServer: {
    port: 3031,
    hot: true,
    headers: { "Access-Control-Allow-Origin": "*" },
  },
  resolve: {
    extensions: [".vue", ".js"],
  },
  module: {
    rules: [
      { test: /\.vue$/, loader: "vue-loader" },
      { test: /\.css$/, use: ["style-loader", "css-loader"] },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
      "process.env.API_BASE_URL": JSON.stringify(API_BASE_URL),
    }),
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({ template: "./public/index.html" }),
    new ModuleFederationPlugin({
      name: "property",
      filename: "remoteEntry.js",
      exposes: {
        "./mount": "./src/mount.js",
      },
      shared: {
        vue: { singleton: true, requiredVersion: "^3.4.0" },
      },
    }),
  ],
};
