const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CopyPlugin = require('copy-webpack-plugin')

const paths = {
    src: path.resolve(__dirname, 'src'),
    public: path.resolve(__dirname, 'public'),
    build: path.resolve(__dirname, 'build', 'frontend')
}
paths.entryPoint = path.resolve(paths.src, 'index.js')

const createBabelLoader = ({
    isDevelopment
}) => ({
    test: /\.(js|jsx|ts|tsx)$/i,
    exclude: /node_modules/,
    use: {
        loader: 'babel-loader',
        options: {
            presets: [
                '@babel/preset-env',
                '@babel/preset-typescript',
                ['@babel/preset-react', { runtime: 'automatic' }]
            ],
            plugins: [
                [
                    '@babel/plugin-proposal-decorators',
                    { legacy: true }
                ],
                ...(isDevelopment ? [
                    'react-refresh/babel'
                ] : [])
            ]
        }
    }
})
const createCopyPlugin = ({
    isDevelopment
}) => (
    new CopyPlugin({
        patterns: [
            { from: 'public', to: isDevelopment ? 'static/frontend' : '' }
        ]
    })
)
const baseConfig = {
    entry: paths.entryPoint,
    output: {
        path: paths.build,
        filename: '[name].[fullhash:8].bundle.js',
        sourceMapFilename: '[file].map[query]',
        chunkFilename: '[id].[chunkhash:8].chunk.js',
        publicPath: '/'
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            importLoaders: 1
                        }
                    },
                    'postcss-loader'
                ]
            },
            {
                test: /\.less$/i,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                    },
                    {
                        loader: 'css-loader'
                    },
                    {
                        loader: 'less-loader',
                        options: {
                            lessOptions: {
                                javascriptEnabled: true
                            }
                        }
                    }
                ]
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: 'asset/resource',
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.resolve(paths.public, 'index.ejs'),
            templateParameters: {
                publicUrl: '/static/frontend/'
            },
            minify: {
                html5: true,
                collapseWhitespace: true,
                minifyCSS: true,
                minifyJS: true,
                minifyURLs: true,
                removeAttributeQuotes: true,
                removeComments: true,
                removeEmptyAttributes: true,
                removeOptionalTags: true,
                removeRedundantAttributes: true,
                removeScriptTypeAttributes: true,
                removeStyleLinkTypeAttributese: true,
                useShortDoctype: true
            }
        }),
        new MiniCssExtractPlugin({
            filename: '[name].[contenthash].css',
            chunkFilename: '[id].[contenthash].css'
        })
    ],
    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx']
    },
    performance: {
        hints: 'warning',
        maxAssetSize: 200000,
        maxEntrypointSize: 400000
    }
}

module.exports = {
    paths,
    baseConfig,
    createBabelLoader,
    createCopyPlugin
}