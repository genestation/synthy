go tool yacc -o synthyQuery.go -p "synthy" synthyQuery.y
pegjs --export-var synthyParser js/synthyParser.pegjs js/synthyParser.js
babel --presets react js/synthy.jsx --out-file js/synthy.js
