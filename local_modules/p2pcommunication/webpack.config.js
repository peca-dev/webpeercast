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
                        presets: [["env", { targets }]],
                        plugins: isProduction
                            ? null
                            : [[
                                "babel-plugin-espower",
                                { "embedAst": true }
                            ]]
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
        index: ["./src/index.ts"],
        server: ["babel-polyfill", "./src/server.ts"],
        "test/test": ["babel-polyfill", "./src/test/test.ts"]
    },
    externals: /^(?!\.)/,
    module: tsModule({ node: 6 }),
    node: {
        __filename: true,
        __dirname: true
    },
    output: {
        filename: "lib/[name].js",
        libraryTarget: "commonjs2"
    },
    plugins: isProduction
        ? [failPlugin]
        : [],
    resolve: { extensions: [".ts", ".tsx", ".js"] },
    target: "node"
};
