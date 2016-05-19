const path = require('path');
const webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
	context: __dirname + "/src",
	entry: {
		core: './js/synthy.jsx',
		client: './js/client.js',
	},
	output: {
		path: __dirname + '/dist',
		filename: 'synthy.[name].js',
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
			{
				test: /\.(woff|woff2)(\?v=\d+\.\d+\.\d+)?$/,
				loader: 'url?limit=1000000&mimetype=application/font-woff'
			},
			{
				test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
				loader: 'url?limit=1000000&mimetype=application/font-sfnt'
			},
			{
				test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
				loader: 'url?limit=1000000&mimetype=application/vnd.ms-fontobject'
			},
			{
				test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
				loader: 'url?limit=1000000&mimetype=image/svg+xml'
			}
		]
	},
	plugins: [
		new ExtractTextPlugin("synthy.[name].css"),
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
