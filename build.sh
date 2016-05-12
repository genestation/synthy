#!/bin/bash

cd "$( dirname "${BASH_SOURCE[0]}" )"
go tool yacc -o dist/synthyQuery.go -p "query" src/synthyQuery.y
node_modules/.bin/webpack
