const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
	context: __dirname + "/src",
	entry: './js/synthy.jsx',
	output: {
		path: __dirname + '/dist',
		filename: 'synthy.js'
	},
	module: {
		loaders: [
			{
				test: /\.scss$/,
				loaders: ExtractTextPlugin.extract("style-loader", "css-loader|autoprefixer-loader|sass-loader"),
				include: path.resolve(__dirname, "./src")
			},
			{
				test: /\.jsx?$/,
				loaders: ['babel?cacheDirectory'],
				include: path.resolve(__dirname, "./src")
			}
		]
	},
	plugins: [
		new ExtractTextPlugin("synthy.css")
	]
};
