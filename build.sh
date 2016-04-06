go tool yacc -o synthyQuery.go -p "synthy" synthyQuery.y
pegjs --export-var synthyParser src/js/synthyParser.pegjs build/js/synthyParser.js
node_modules/.bin/webpack
