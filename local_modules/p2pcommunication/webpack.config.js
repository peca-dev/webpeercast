const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const failPlugin = require("webpack-fail-plugin");
const uglifySaveLicense = require("uglify-save-license");

const isProduction = process.env.NODE_ENV === "production";

let common = {
    devtool: isProduction
        ? false
        : "inline-source-map",
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
                index: ["babel-polyfill", "webrtc-adapter", "./src/public/js/index.ts"],
                "test/test": ["babel-polyfill", "webrtc-adapter", "./src/public/js/test/test.ts"]
            },
            module: tsModule({ browsers: ["last 2 versions"] }),
            node: {
                __filename: true,
                __dirname: true
            },
            output: {
                filename: "lib/public/js/[name].js"
            },
            plugins: common.plugins.concat([
                new CopyWebpackPlugin(
                    [{ from: "src/public/", to: "lib/public/" }],
                    {
                        ignore: [
                            "test/",
                            "*.ts",
                            "*.tsx"
                        ]
                    })
            ])
                .concat(isProduction
                    ? [
                        new webpack.optimize.UglifyJsPlugin({
                            output: { comments: uglifySaveLicense }
                        })
                    ]
                    : []),
            target: "web"
        }
    ),
    Object.assign({},
        common,
        {
            entry: {
                index: ["babel-polyfill", "./src/index.ts"],
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
            target: "node"
        }
    )
];
