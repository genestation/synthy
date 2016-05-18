const path = require('path');
const webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
	context: __dirname + "/src",
	entry: './js/synthy.jsx',
	output: {
		path: __dirname + '/dist',
		filename: 'synthy.js',
		library: "Synthy",
		libraryTarget: "var"
	},
	module: {
		loaders: [
			{
				test: /\.jsx?$/,
				loaders: ['babel?cacheDirectory'],
				include: path.resolve(__dirname, "./src")
			},
			{
				test: /\.pegjs$/,
				loader: 'pegjs-loader'
			},
			{
				test: /\.css$/,
				loader: ExtractTextPlugin.extract("style-loader", "css-loader")
			},
		]
	},
	plugins: [
		new ExtractTextPlugin("synthy.css"),
	]
};


var production_plugins = [
	new webpack.DefinePlugin({
		'process.env.NODE_ENV': '"production"'
	}),
	new webpack.optimize.UglifyJsPlugin(),
	new webpack.optimize.OccurenceOrderPlugin(),
	new webpack.optimize.DedupePlugin()
];

if(process.argv.indexOf('--debug') == -1) {
	module.exports.plugins.push(...production_plugins)
}
