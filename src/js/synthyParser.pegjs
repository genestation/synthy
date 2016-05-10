{
	var nextKey = 0;
	function getNextKey() {
		return this.nextKey++;
	};
}

root
	= scope:scope _ top:top
	{
		return {nextKey: nextKey, scope: scope, rules: top};
	}
	/ top:top _
	{
		return {nextKey: nextKey, scope: null, rules: top};
	}
	/ scope:scope _
	{
		return {nextKey: nextKey, scope: scope, rules: null};
	}
	/ ''
	{
		return {nextKey: nextKey, scope: null, rules:null};
	}
top
	= directive:directive
	{
		if(directive.grouped) {
			return {
				condition: 'AND',
				rules: [directive],
				key: nextKey()
			}
		} else {
			return directive;
		}
	}

directive
	= disjunction:disjunction
	{
		if (disjunction.length === 1) {
			if (disjunction[0].condition) {
				return disjunction[0];
			} else {
				return {
					condition: 'AND',
					rules: [disjunction[0]],
					key: nextKey()
				};
			}
		} else {
			return {
				condition: 'OR',
				rules: disjunction,
				key: nextKey()
			};
		}
	}

disjunction
	= head:conjunction ( _ 'OR' _ tail:conjunction)+
	{
		head.key = nextKey();
		return [head].concat(tail.map(function(e){var rule = e[e.length-1]; rule.key = nextKey(); return rule;}));
	}
	/ conjunction:conjunction
	{
		if (conjunction.length === 1) {
			return conjunction;
		} else {
			return [{
				condition: 'AND',
				rules: conjunction,
				key: nextKey()
			}];
		}
	}

conjunction
	= head:rule tail:( _ 'AND' _ rule)+
	{
		head.key = nextKey();
		return [head].concat(tail.map(function(e){var rule = e[e.length-1]; rule.key = nextKey(); return rule;}));
	}
	/ rule:rule
	{
		rule.key = nextKey();
		return [rule];
	}

rule
	= field:field _ '=' _ value:num
	{
		return {
			field: field,
			operator: 'equal',
			value: value
		};
	}
	/ field:field _ '!=' _ value:num
	{
		return {
			field: field,
			operator: 'not_equal',
			value: value
		};
	}
	/ field:field _ '≠' _ value:num
	{
		return {
			field: field,
			operator: 'not_equal',
			value: value
		};
	}
	/ field:field _ '>' _ value:num
	{
		return {
			field: field,
			operator: 'greater',
			value: value
		};
	}
	/ field:field _ '>=' _ value:num
	{
		return {
			field: field,
			operator: 'greater_or_equal',
			value: value
		};
	}
	/ field:field _ '≥' _ value:num
	{
		return {
			field: field,
			operator: 'greater_or_equal',
			value: value
		};
	}
	/ field:field _ '<' _ value:num
	{
		return {
			field: field,
			operator: 'less',
			value: value
		};
	}
	/ field:field _ '<=' _ value:num
	{
		return {
			field: field,
			operator: 'less_or_equal',
			value: value
		};
	}
	/ field:field _ '≤' _ value:num
	{
		return {
			field: field,
			operator: 'less_or_equal',
			value: value
		};
	}
	/ value:num _ '=' _ field:field
	{
		return {
			field: field,
			operator: 'equal',
			value: value
		};
	}
	/ value:num _ '!=' _ field:field
	{
		return {
			field: field,
			operator: 'not_equal',
			value: value
		};
	}
	/ value:num _ '≠' _ field:field
	{
		return {
			field: field,
			operator: 'not_equal',
			value: value
		};
	}
	/ value:num _ '>' _ field:field
	{
		return {
			field: field,
			operator: 'less',
			value: value
		};
	}
	/ value:num _ '>=' _ field:field
	{
		return {
			field: field,
			operator: 'less_or_equal',
			value: value
		};
	}
	/ value:num _ '≥' _ field:field
	{
		return {
			field: field,
			operator: 'less_or_equal',
			value: value
		};
	}
	/ value:num _ '<' _ field:field
	{
		return {
			field: field,
			operator: 'greater',
			value: value
		};
	}
	/ value:num _ '<=' _ field:field
	{
		return {
			field: field,
			operator: 'greater_or_equal',
			value: value
		};
	}
	/ value:num _ '≤' _ field:field
	{
		return {
			field: field,
			operator: 'greater_or_equal',
			value: value
		};
	}
	/ value:phrase _ field:field
	{
		return {
			field: field,
			operator: 'match',
			value: value
		};
	}
	/ value:phrase _ '=' _ field:field
	{
		return {
			field: field,
			operator: 'match',
			value: value
		};
	}
	/ field:field _ '=' _ value:phrase
	{
		return {
			field: field,
			operator: 'match',
			value: value
		};
	}
	/ value:phrase
	{
		return {
			field: "",
			operator: 'match',
			value: value
		};
	}
	/ '(' _ directive:directive _ ')'
	{
		directive.grouped = true
		return directive;
	}
	/ 'NOT' _ directive:directive
	{
		directive.complement = true
		return directive;
	}
	/ field:field
	{
		return {
			field: field,
			operator: 'exists'
		};
	}
	/
	{ /* empty conjunction */
		return {
			field: ""
		};
	}

scope
	= '@' name:[a-zA-Z/]+
	{
		return name.join("").toLowerCase();
	}

field
	= '[' name:[^\]]+ ']'
	{
		return name.join("").replace(/ /g,"");
	}

phrase
	= word:[a-zA-Z0-9/\-.*?]+ _ phrase:phrase
	{
		return word.join("") + ' ' + phrase;
	}
	/ word:[a-zA-Z0-9/\-.*?]+
	{
		return word.join("");
	}
	/ '"' phrase:[^"]* '"'
	{
		return '"' + phrase.join("") + '"';
	}

num
	= sign:sign digits:digits frac:frac exp:exp
	{
		return sign + digits + frac + exp;
	}
	/ sign:sign digits:digits frac:frac
	{
		return sign + digits + frac;
	}
	/ sign:sign digits:digits exp:exp
	{
		return sign + digits + exp;
	}
	/ sign:sign digits:digits
	{
		return sign + digits;
	}
	/ sign:sign frac:frac
	{
		return sign + frac;
	}
	/ sign:sign exp:exp
	{
		return sign + exp;
	}

frac
	= '.' digits:digits
	{
		return '.' + digits;
	}

exp
	= e:e digits:digits
	{
		return e + digits;
	}

digits
	= digits:[0-9]+
	{
		return digits.join("");
	}

e
	= e:[eE] sign:sign
	{
		return e + sign;
	}

sign
	= sign:[+-]? 
	{
		return sign?sign:"";
	}
_
	= [' '\t\r\n]*
