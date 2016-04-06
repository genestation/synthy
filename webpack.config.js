var path = require('path')

module.exports = {
	context: __dirname + "/src",
	entry: './js/synthy.jsx',
	output: {
		path: __dirname + '/dist',
		filename: 'bundle.js'
	},
	module: {
		loaders: [
			{
				test: /\.css$/,
				loaders: ['style', 'css'],
				include: path.resolve(__dirname, "./src")
			},
			{
				test: /\.jsx?$/,
				loaders: ['babel?cacheDirectory'],
				include: path.resolve(__dirname, "./src")
			}
		]
	},
};
