const path = require('path');
const webpack = require('webpack');
var MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
	mode: 'development',
	context: __dirname + "/src",
	entry: './synthy.jsx',
	output: {
		path: __dirname + '/dist',
		filename: 'synthy.js',
		library: "Synthy",
		libraryTarget: "var"
	},
	module: {
		rules: [
			{
				test: /\.(t|j)sx?$/,
				use: 'babel-loader',
			},
			{
				test: /\.pegjs$/,
				use: 'pegjs-loader',
			},
			{
				test: /\.s?css$/,
				use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"]
			},
			{
				test: /\.(woff|woff2)(\?v=\d+\.\d+\.\d+)?$/,
				use: 'url-loader?limit=1000000&mimetype=application/font-woff'
			},
			{
				test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
				use: 'url-loader?limit=1000000&mimetype=application/font-sfnt'
			},
			{
				test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
				use: 'url-loader?limit=1000000&mimetype=application/vnd.ms-fontobject'
			},
			{
				test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
				use: 'url-loader?limit=1000000&mimetype=image/svg+xml'
			}
		]
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: "synthy.css",
		}),
	]
};
