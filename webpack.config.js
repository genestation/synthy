const path = require('path');

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
			}
		]
	},
	externals: {
		'react': 'React',
		'react-dom': 'ReactDOM',
	},
};
