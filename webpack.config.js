const common = {
	entry: './src/js/synthy.jsx',
	output: {
		path: './app',
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
