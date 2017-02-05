const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const failPlugin = require("webpack-fail-plugin");
const uglifySaveLicense = require("uglify-save-license");

const isProduction = process.env.NODE_ENV === "production";

let common = {
    devtool: isProduction
        ? false
        : "inline-source-map",
    node: {
        __filename: true,
        __dirname: true
    },
    plugins: isProduction
        ? [failPlugin]
        : [],
    resolve: { extensions: [".ts", ".tsx", ".js"] }
};

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

module.exports = [
    Object.assign({},
        common,
        {
            entry: {
                "test/test": ["babel-polyfill", "webrtc-adapter", "./src/test/test.ts"]
            },
            module: tsModule({ browsers: ["last 2 versions"] }),
            output: {
                filename: "lib/[name].js"
            },
            target: "web"
        }
    ),
    Object.assign({},
        common,
        {
            entry: {
                index: ["./src/index.ts"]
            },
            externals: /^(?!\.)/,
            module: tsModule({ node: 6 }),
            output: {
                filename: "lib/[name].js",
                libraryTarget: "commonjs2"
            },
            target: "node"
        }
    )
];
