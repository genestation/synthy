go tool yacc -o dist/synthyQuery.go -p "synthy" src/synthyQuery.y
pegjs --export-var synthyParser src/js/synthyParser.pegjs dist/synthyParser.js
node_modules/.bin/webpack
