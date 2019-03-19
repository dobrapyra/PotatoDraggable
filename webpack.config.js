/* global require module __dirname */
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');

module.exports = (env, args) => {
  const devMode = args.mode !== 'production';

  return {
    mode: devMode ? 'development' : 'production',
    devtool: devMode ? 'inline-source-map' : 'none',
    devServer: {
      contentBase: path.resolve(__dirname, '.'),
      port: 4000,
      open: true
    },
    entry: './src/main.js',
    output: {
      path: path.resolve(__dirname, './dist'),
      filename: 'main.js',
      // publicPath: './dist'
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['env']
            }
          }
        },
        {
          test: /\.s?css$/,
          use: [
            devMode ? 'style-loader' : MiniCssExtractPlugin.loader,
            'css-loader',
            'sass-loader'
          ]
        }
      ]
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: 'main.css'
      })
    ]
  };
};
