import path from "path";
import webpack from "webpack";

const config: webpack.Configuration = {
    mode: "production",
    devtool: "inline-source-map",

    entry: {
        main: "./src/hftnn.ts",
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "ts-loader"
            }
        ]
    },
    output: {
        path: path.resolve(__dirname, './build'),
        filename: "hftnn-bundle.js",
        libraryTarget: "umd",
        library: "HFTNN"
    },
    target: ["web", "es5"]
};

export default config;
