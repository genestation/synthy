root
	= scope:scope _ top:top
	{
		return {scope: scope, rules: top};
	}
	/ top:top _
	{
		return {scope: null, rules: top};
	}
	/ scope:scope _
	{
		return {scope: scope, rules: null};
	}
	/ ''
	{
		return {scope: null, rules:null};
	}
top
	= directive:directive
	{
		if(directive.grouped) {
			return {
				condition: 'AND',
				rules: [directive],
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
				};
			}
		} else {
			return {
				condition: 'OR',
				rules: disjunction,
			};
		}
	}

disjunction
	= head:conjunction tail:( _ 'OR' _ conjunction)+
	{
		return [head].concat(tail.map(function(e){var rule = e[e.length-1]; return rule;}));
	}
	/ conjunction:conjunction
	{
		if (conjunction.length === 1) {
			return conjunction;
		} else {
			return [{
				condition: 'AND',
				rules: conjunction,
			}];
		}
	}

conjunction
	= head:rule tail:( _ 'AND' _ rule)+
	{
		return [head].concat(tail.map(function(e){var rule = e[e.length-1]; return rule;}));
	}
	/ rule:rule
	{
		return [rule];
	}

rule
	= field:field _ '=' _ value:num
	{
		let rule = {
			term: {
			}
		}
		rule.term[field] = value;
		return rule;
	}
	/ field:field _ '!=' _ value:num
	{
		let term = {
			term: {
			}
		}
		trm.term[field] = value;
		let rule = {
			bool: {
				must_not: [term],
			}
		}
		return rule;
	}
	/ field:field _ '≠' _ value:num
	{
		let term = {
			term: {
			}
		}
		trm.term[field] = value;
		let rule = {
			bool: {
				must_not: [term],
			}
		}
		return rule;
	}
	/ field:field _ '>' _ value:num
	{ // TODO
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
	/ 'NOT' _ rule:rule
	{
		rule.complement = true
		return rule;
	}
	/ 'NOT' _ directive:directive
	{
		directive.complement = true
		return directive;
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
	/ field:field
	{
		return {
			field: field,
			operator: 'exists'
		};
	}
	/ _
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
		return Number(sign + digits + frac + exp);
	}
	/ sign:sign digits:digits frac:frac
	{
		return Number(sign + digits + frac);
	}
	/ sign:sign digits:digits exp:exp
	{
		return Number(sign + digits + exp);
	}
	/ sign:sign digits:digits
	{
		return Number(sign + digits);
	}
	/ sign:sign frac:frac
	{
		return Number(sign + frac);
	}
	/ sign:sign exp:exp
	{
		return Number(sign + exp);
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
