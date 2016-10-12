%{

package main

import (
	"bytes"
	"log"
	"unicode/utf8"
	"unicode"
	"strings"
	"strconv"

	"gopkg.in/olivere/elastic.v3"
)

type numstring struct {
	Num float64
	String string
}

type field struct {
	Meta elasticField
	Context []string
}

type queryFactory func(field string) elastic.Query
func createQuery(field field, factory queryFactory) elastic.Query {
	var query elastic.Query
	if len(field.Meta.Closure) == 1 {
		query = factory(field.Meta.Closure[0])
	} else {
		query = elastic.NewBoolQuery()
		for _,item := range field.Meta.Closure {
			query = query.(*elastic.BoolQuery).Should(factory(item))
		}
	}
	if len(field.Meta.Nest) > 0 {
		i := len(field.Meta.Nest)-1
		last := elastic.NewNestedQuery(field.Meta.Nest[i],query)
		for i--; i >= 0; i-- {
			last = elastic.NewNestedQuery(field.Meta.Nest[i],last)
		}
		return last
	} else {
		return query
	}
}

%}

%union {
	word string
	nest []string
	field field
	num numstring
	query elastic.Query
	scope elasticScope
	conjunction []elastic.Query
	disjunction []elastic.Query
}

%type	<word>	word phrase
%type	<field>	field
%type	<scope> scope
%type	<query> query directive
%type	<conjunction> conjunction
%type	<disjunction> disjunction

%left AND OR
%right NOT
%left EQ NE LT GT LE GE
%nonassoc '(' ')' QUOTE ENDNEST

%token	<num>	NUM
%token	<word>	WORD SCOPE
%token	<nest> NEST
%token	<field>	FIELD
%token	ERROR

%%

top:
	directive
	{
		querylex.(*synthyLex).Out.Query = $1
	}
|	scope directive
	{
		querylex.(*synthyLex).Out.Scope = $1
		querylex.(*synthyLex).Out.Query = $2
	}
scope:
	SCOPE
	{
		if val,ok := elasticMeta.Scopes[$1]; ok {
			$$ = val
		} else {
			scope := strings.SplitN($1,"/",1)
			doctype := ""
			if len(scope) > 1 {
				doctype = strings.Replace(scope[1],"/","_",-1)
			}
			$$ = elasticScope{
				Index: scope[0],
				Type: doctype,
			}
		}
	}

directive:
	disjunction
	{
		if len($1) > 1 {
			$$ = elastic.NewBoolQuery().Should($1...)
		} else if len($1) > 0 {
			$$ = $1[0]
		}
	}

disjunction:
	conjunction
	{
		if len($1) > 1 {
			$$ = append($$, elastic.NewBoolQuery().Must($1...))
		} else if len($1) > 0 {
			$$ = append($$, $1[0])
		} else {
			$$ = append($$,elastic.NewMatchAllQuery())
		}
	}
|	disjunction OR conjunction
	{
		if len($3) > 1 {
			$$ = append($1, elastic.NewBoolQuery().Must($3...))
		} else if len($3) > 0 {
			$$ = append($1, $3[0])
		} else {
			$$ = append($1,elastic.NewMatchAllQuery())
		}
	}

conjunction:
	query
	{
		$$ = append($$,$1)
	}
|	conjunction AND query
	{
		$$ = append($1,$3)
	}

query:
	/* empty */
	{
		$$ = elastic.NewMatchAllQuery();
	}
|	field
	{
		$$ = createQuery($1, func(field string) elastic.Query {
			return elastic.NewExistsQuery(field);
		})
	}
|	field EQ NUM
	{
		$$ = createQuery($1, func(field string) elastic.Query {
			return elastic.NewRangeQuery(field).
				From($3.Num).To($3.Num).
				IncludeLower(true).IncludeUpper(true)
		})
	}
|	field NE NUM
	{
		$$ = createQuery($1, func(field string) elastic.Query {
			return elastic.NewBoolQuery().Should(
				elastic.NewRangeQuery(field).Gt($3.Num),
				elastic.NewRangeQuery(field).Lt($3.Num),
			)
		})
	}
|	field GT NUM
	{
		$$ = createQuery($1, func(field string) elastic.Query {
			return elastic.NewRangeQuery(field).Gt($3.Num)
		})
	}
|	field GE NUM
	{
		$$ = createQuery($1, func(field string) elastic.Query {
			return elastic.NewRangeQuery(field).Gte($3.Num)
		})
	}
|	field LT NUM
	{
		$$ = createQuery($1, func(field string) elastic.Query {
			return elastic.NewRangeQuery(field).Lt($3.Num)
		})
	}
|	field LE NUM
	{
		$$ = createQuery($1, func(field string) elastic.Query {
			return elastic.NewRangeQuery(field).Lte($3.Num)
		})
	}
|	NUM EQ field
	{
		$$ = createQuery($3, func(field string) elastic.Query {
			return elastic.NewRangeQuery(field).
				From($1.Num).To($1.Num).
				IncludeLower(true).IncludeUpper(true)
		})
	}
|	NUM NE field
	{
		$$ = createQuery($3, func(field string) elastic.Query {
			return elastic.NewBoolQuery().Should(
				elastic.NewRangeQuery(field).Gt($1.Num),
				elastic.NewRangeQuery(field).Lt($1.Num),
			)
		})
	}
|	NUM GT field
	{
		$$ = createQuery($3, func(field string) elastic.Query {
			return elastic.NewRangeQuery(field).Lt($1.Num)
		})
	}
|	NUM GE field
	{
		$$ = createQuery($3, func(field string) elastic.Query {
			return elastic.NewRangeQuery(field).Lte($1.Num)
		})
	}
|	NUM LT field
	{
		$$ = createQuery($3, func(field string) elastic.Query {
			return elastic.NewRangeQuery(field).Gt($1.Num)
		})
	}
|	NUM LE field
	{
		$$ = createQuery($3, func(field string) elastic.Query {
			return elastic.NewRangeQuery(field).Gte($1.Num)
		})
	}
|	word
	{
		if strings.ContainsAny($1,"*?") {
			$$ = elastic.NewWildcardQuery("_all",$1)
		} else {
			$$ = elastic.NewBoolQuery().Should(
				elastic.NewMatchQuery("_all",$1),
				elastic.NewPrefixQuery("_all",$1),
			)
		}
	}
|	word field
	{
		$$ = createQuery($2, func(field string) elastic.Query {
			if strings.ContainsAny($1,"*?") {
				return elastic.NewWildcardQuery(field,$1)
			} else {
				return elastic.NewMatchQuery(field,$1)
			}
		})
	}
|	word EQ field
	{
		$$ = createQuery($3, func(field string) elastic.Query {
			if strings.ContainsAny($1,"*?") {
				return elastic.NewWildcardQuery(field,$1)
			} else {
				return elastic.NewMatchQuery(field,$1)
			}
		})
	}
|	field EQ word
	{
		$$ = createQuery($1, func(field string) elastic.Query {
			if strings.ContainsAny($3,"*?") {
				return elastic.NewWildcardQuery(field,$3)
			} else {
				return elastic.NewMatchQuery(field,$3)
			}
		})
	}
|	phrase
	{
		if strings.ContainsAny($1,"*?") {
			$$ = elastic.NewWildcardQuery("_all",$1)
		} else {
			$$ = elastic.NewMatchPhraseQuery("_all",$1)
		}
	}
|	phrase field
	{
		$$ = createQuery($2, func(field string) elastic.Query {
			if strings.ContainsAny($1,"*?") {
				return elastic.NewWildcardQuery(field,$1)
			} else {
				return elastic.NewMatchPhraseQuery(field,$1)
			}
		})
	}
|	phrase EQ field
	{
		$$ = createQuery($3, func(field string) elastic.Query {
			if strings.ContainsAny($1,"*?") {
				return elastic.NewWildcardQuery(field,$1)
			} else {
				return elastic.NewMatchPhraseQuery(field,$1)
			}
		})
	}
|	field EQ phrase
	{
		$$ = createQuery($1, func(field string) elastic.Query {
			if strings.ContainsAny($3,"*?") {
				return elastic.NewWildcardQuery(field,$3)
			} else {
				return elastic.NewMatchPhraseQuery(field,$3)
			}
		})
	}
|	'(' directive ')'
	{
		$$ = $2
	}
|	NEST directive ENDNEST
	{
		if len($1) > 0 {
			i := len($1)-1
			last := elastic.NewNestedQuery($1[i],$2)
			for i--; i >= 0; i-- {
				last = elastic.NewNestedQuery($1[i],last)
			}
			$$ = last
		} else {
			$$ = $2
		}
	}
|	NOT query
	{
		$$ = elastic.NewBoolQuery().MustNot($2)
	}

field:
	FIELD
	{
		$$ = $1
	}

phrase:
	QUOTE word QUOTE
	{
		$$ = $2
	}

word:
	WORD
	{
		$$ = $1
	}
|	word NUM
	{
		$$ = strings.Join([]string{$1,$2.String}, " ")
	}
|	word WORD
	{
		$$ = strings.Join([]string{$1,$2}, " ")
	}

%%

// The parser expects the lexer to return 0 on EOF.  Give it a name
// for clarity.
const eof = 0

// The parser uses the type <prefix>Lex as a lexer.  It must provide
// the methods Lex(*<prefix>SymType) int and Error(string).
type synthyLex struct {
	line []byte
	peek rune
	Out elasticDirective
	Scope string
	Context []string
	Bad bool
}

// The parser calls this method to get each new token.
func (x *synthyLex) Lex(yylval *querySymType) int {
	for {
		c := x.next()
		switch c {
		case eof:
			return eof
		case '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '+', '-':
			return x.num(c, yylval)
		case '(', ')':
			return int(c)
		case '{':
			return x.nest(c, yylval)
		case '}':
			if len(x.Context) > 0 {
				x.Context = x.Context[:len(x.Context)-1]
			}
			return ENDNEST
		case '[':
			return x.field(c, yylval)
		case '@':
			return x.scope(c, yylval)
		case '<', '>':
			return x.op(c, yylval)
		case '=':
			return EQ
		case '"':
			return QUOTE

		// Recognize Unicode symbols
		// returning what the parser expects.
		case '≤':
			return LE
		case '≥':
			return GE
		case '≠':
			return NE

		default:
			if 'a' <= c && c <= 'z' || 'A' <= c && c <= 'Z' {
				return x.word(c, yylval)
			}
		}
	}
}

// Lex a number.
func (x *synthyLex) num(c rune, yylval *querySymType) int {
	var b bytes.Buffer
	state := 0
	x.add(&b, c)
	if c == '.' {
		state = 1
	}
	L: for {
		c = x.next()
		switch state {
		case 0:
			switch c {
			case '0', '1', '2', '3', '4', '5', '6', '7', '8', '9':
				x.add(&b, c)
			case '.':
				state = 1
				x.add(&b, c)
			case 'e', 'E':
				state = 2
				x.add(&b, c)
			default:
				break L
			}
		case 1:
			switch c {
			case '0', '1', '2', '3', '4', '5', '6', '7', '8', '9':
				x.add(&b, c)
			case 'e', 'E':
				state = 2
				x.add(&b, c)
			default:
				break L
			}
		case 2:
			switch c {
			case '0', '1', '2', '3', '4', '5', '6', '7', '8', '9':
				state = 3
				x.add(&b, c)
			case '-', '+':
				state = 3
				x.add(&b, c)
			default:
				break L
			}
		case 3:
			switch c {
			case '0', '1', '2', '3', '4', '5', '6', '7', '8', '9':
				x.add(&b, c)
			default:
				break L
			}
		}
	}
	x.unpeek(c)
	yylval.num.String = strings.ToLower(b.String())
	if f, err := strconv.ParseFloat(b.String(),64); err == nil {
		yylval.num.Num = f
	} else {
		yylval.word = yylval.num.String
		return WORD
	}
	return NUM
}

// Lex a nest.
func (x *synthyLex) nest(c rune, yylval *querySymType) int {
	var b bytes.Buffer
	L: for {
		c = x.next()
		switch c {
		case ':':
			break L
		case eof:
			return ERROR
		default:
			if unicode.IsSpace(c) {
				continue
			} else {
				x.add(&b, c)
			}
		}
	}
	base := strings.ToLower(b.String())
	var last string
	if len(x.Context) > 0 {
		last = x.Context[len(x.Context)-1]
		base = last + "." + base
	}
	x.Context = append(x.Context,base)

	var meta elasticField
	if len(x.Scope) > 0 {
		meta = elasticMeta.Fields[x.Scope][base]
	} else {
		meta = elasticMeta.Fields[scopeManifest[0]][base]
	}
	var threshold int
	for idx, val := range meta.Nest {
		if len(val) > len(last) {
			threshold = idx
			break
		}
	}
	yylval.nest = meta.Nest[threshold:]
	return NEST
}

// Lex a feild.
func (x *synthyLex) field(c rune, yylval *querySymType) int {
	var b bytes.Buffer
	L: for {
		c = x.next()
		switch c {
		case ']':
			break L
		case eof:
			return ERROR
		default:
			if unicode.IsSpace(c) {
				continue
			} else {
				x.add(&b, c)
			}
		}
	}
	base := strings.ToLower(b.String())
	if len(x.Context) > 0 {
		base = strings.Join(x.Context,".") + "." + base
		yylval.field.Context = x.Context
	}
	if len(x.Scope) > 0 {
		yylval.field.Meta = elasticMeta.Fields[x.Scope][base]
	} else {
		yylval.field.Meta = elasticMeta.Fields[scopeManifest[0]][base]
	}
	return FIELD
}

// Lex a scope.
func (x *synthyLex) scope(c rune, yylval *querySymType) int {
	var b bytes.Buffer
	L: for {
		c = x.next()
		if 'a' <= c && c <= 'z' || 'A' <= c && c<= 'Z' || c == '/' {
			x.add(&b, c)
		} else {
			break L
		}
	}
	x.unpeek(c)
	yylval.word = strings.ToLower(b.String())
	if len(x.Scope) == 0 {
		x.Scope = yylval.word
		return SCOPE
	} else {
		return ERROR
	}
}

// Lex a word.
func (x *synthyLex) word(c rune, yylval *querySymType) int {
	var b bytes.Buffer
	x.add(&b, c)
	L: for {
		c = x.next()
		switch c {
		case '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '.', '*', '?':
			x.add(&b, c)
		default:
			if 'a' <= c && c <= 'z' || 'A' <= c && c <= 'Z' {
				x.add(&b, c)
			} else {
				break L
			}
		}
	}
	x.unpeek(c)
	switch b.String() {
	case "AND":
		return AND
	case "OR":
		return OR
	case "NOT":
		return NOT
	default:
		yylval.word = strings.ToLower(b.String())
		return WORD
	}
}

// Lex an operator.
func (x *synthyLex) op(c rune, yylval *querySymType) int {
	var b bytes.Buffer
	state := c
	x.add(&b, c)
	c = x.next()
	switch state {
	case '<':
		if c == '=' {
			return LE
		} else {
			x.unpeek(c)
			return LT
		}
	case '>':
		if c == '=' {
			return GE
		} else {
			x.unpeek(c)
			return GT
		}
	default:
		return ERROR
	}
}

// Return the next rune for the lexer.
func (x *synthyLex) next() rune {
	if x.peek != eof {
		r := x.peek
		x.peek = eof
		return r
	}
	if len(x.line) == 0 {
		return eof
	}
	c, size := utf8.DecodeRune(x.line)
	x.line = x.line[size:]
	if c == utf8.RuneError && size == 1 {
		log.Print("invalid utf8")
		return x.next()
	}
	return c
}

func (x *synthyLex) add(b *bytes.Buffer, c rune) {
	if _, err := b.WriteRune(c); err != nil {
		log.Fatalf("WriteRune: %s", err)
	}
}

func (x *synthyLex) unpeek(c rune) {
	if c != eof {
		x.peek = c
	}
}

// The parser calls this method on a parse error.
func (x *synthyLex) Error(s string) {
	log.Printf("parse error: %s", s)
	x.Bad = true
}

func parseQuery(line string) elasticDirective {
	q := synthyLex{line: []byte(line)}
	queryParse(&q)
	if q.Bad {
		// If parse failed
		if strings.ContainsAny(line,"*?") {
			q.Out.Query = elastic.NewWildcardQuery("_all",line)
		} else {
			q.Out.Query = elastic.NewBoolQuery().Should(
				elastic.NewMatchQuery("_all",line),
				elastic.NewPrefixQuery("_all",line),
			)
		}
	}
	return q.Out
}
