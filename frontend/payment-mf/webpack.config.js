const { ModuleFederationPlugin } = require("webpack").container;
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
const path = require("path");

const PUBLIC_PATH = process.env.PUBLIC_PATH || "http://localhost:3035/";
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:4000";

module.exports = {
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    publicPath: PUBLIC_PATH,
    uniqueName: "payment-mf",
  },
  devServer: {
    port: 3035,
    hot: true,
    headers: { "Access-Control-Allow-Origin": "*" },
  },
  resolve: { extensions: [".jsx", ".js"] },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        use: "babel-loader",
        exclude: /node_modules/,
      },
      { test: /\.css$/, use: ["style-loader", "css-loader"] },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: "./public/index.html" }),
    new webpack.DefinePlugin({
      "process.env.API_BASE_URL": JSON.stringify(API_BASE_URL),
    }),
    new ModuleFederationPlugin({
      name: "payment",
      filename: "remoteEntry.js",
      exposes: {
        "./mount": "./src/mount.js",
      },
      shared: {
        react: { singleton: true, requiredVersion: false },
        "react-dom": { singleton: true, requiredVersion: false },
      },
    }),
  ],
};
