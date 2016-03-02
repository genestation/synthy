go tool yacc -o synthyQuery.go -p "synthy" synthyQuery.y
pegjs --export-var synthyParser js/synthyParser.pegjs js/synthyParser.js
jsx -x jsx js js
