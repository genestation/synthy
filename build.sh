go tool yacc -o query.go -p "query" query.y
pegjs --export-var reverseParser query.pegjs query.js
jsx -x jsx . .
