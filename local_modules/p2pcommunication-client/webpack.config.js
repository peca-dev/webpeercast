const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const failPlugin = require("webpack-fail-plugin");
const uglifySaveLicense = require("uglify-save-license");

const isProduction = process.env.NODE_ENV === "production";

function tsModule(targets) {
  return {
    rules: [{
      test: /\.tsx?$/,
      use: [
        {
          loader: "babel-loader",
          options: {
            env: {
              delelopment: {
                plugins: [[
                  "babel-plugin-espower",
                  { "embedAst": true }
                ]]
              },
              production: {
                presets: ["babili"]
              }
            },
            presets: [["env", { targets }]]
          }
        },
        {
          loader: "ts-loader",
          options: { compilerOptions: { sourceMap: !isProduction } }
        }
      ]
    }]
  };
}

module.exports = {
  devtool: isProduction
    ? false
    : "inline-source-map",
  entry: {
    index: ["babel-polyfill", "./src/public/js/index.ts"]
  },
  module: tsModule({ browsers: ["last 2 versions"] }),
  node: {
    __filename: true,
    __dirname: true
  },
  output: {
    filename: "lib/public/js/[name].js"
  },
  plugins: [
    new CopyWebpackPlugin(
      [{ from: "src/public/", to: "lib/public/" }],
      {
        ignore: [
          "test/",
          "*.ts",
          "*.tsx"
        ]
      })
  ].concat(isProduction
    ? [
      failPlugin,
      new webpack.optimize.UglifyJsPlugin({
        output: { comments: uglifySaveLicense }
      })
    ]
    : []
    ),
  resolve: { extensions: [".ts", ".tsx", ".js"] },
  target: "web"
};
