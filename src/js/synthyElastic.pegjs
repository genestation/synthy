{
// Options
// schemas = map of scopes to elasticsearch schemas
// default_scope

	function fieldClosure(field, mapping) {
		// Initialize
		let ptr = mapping
		let path = [];
		let nest = [];
		// Find location in mapping
		for(let part of field.split('.')) {
			if(ptr.properties === undefined) {
				return null;
			}
			if(ptr.properties[part] === undefined) {
				return null;
			} else {
				ptr = ptr.properties[part];
				path.push(part);
			}
			if(ptr.type === 'nested') {
				nest.push(path.join('.'));
			}
		}
		// Compute transitive closure
		let closure = [];
		let stack = [{ptr: ptr, path: path, nest: nest}];
		while(stack.length > 0) {
			let state = stack.pop();
			ptr = state.ptr;
			if(ptr.properties !== undefined) {
				for(let key in ptr.properties) {
					path = state.path.slice();
					nest = state.nest.slice();
					path.push(key);
					if(ptr.properties[key].type === 'nested') {
						nest.push(path.join('.'));
					}
					stack.push({ptr: ptr.properties[key], path: path, nest: nest});
				}
			} else {
				closure.push({field: state.path.join('.'), nest: state.nest});
			}
		}
		return closure;
	}
}

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
		let query = {
			term: {}
		};
		query.term[field] = value;
		return query;
	}
	/ field:field _ '!=' _ value:num
	{
		let term = {
			term: {}
		}
		term.term[field] = value;
		let query = {
			bool: {
				must_not: [term],
			}
		};
		return query;
	}
	/ field:field _ '≠' _ value:num
	{
		let term = {
			term: {
			}
		}
		term.term[field] = value;
		let query = {
			bool: {
				must_not: [term],
			}
		};
		return query;
	}
	/ field:field _ '>' _ value:num
	{
		let query = {
			range: {}
		};
		query.range[field] = {
			gt: value,
		};
		return query;
	}
	/ field:field _ '>=' _ value:num
	{
		let query = {
			range: {}
		};
		query.range[field] = {
			gte: value,
		};
		return query;
	}
	/ field:field _ '≥' _ value:num
	{
		let query = {
			range: {}
		};
		query.range[field] = {
			gte: value,
		};
		return query;
	}
	/ field:field _ '<' _ value:num
	{
		let query = {
			range: {}
		};
		query.range[field] = {
			lt: value,
		};
		return query;
	}
	/ field:field _ '<=' _ value:num
	{
		let query = {
			range: {}
		};
		query.range[field] = {
			lte: value,
		};
		return query;
	}
	/ field:field _ '≤' _ value:num
	{
		let query = {
			range: {}
		};
		query.range[field] = {
			lte: value,
		};
		return query;
	}
	/ value:num _ '=' _ field:field
	{
		let query = {
			term: {}
		};
		query.term[field] = value;
		return query;
	}
	/ value:num _ '!=' _ field:field
	{
		let term = {
			term: {}
		}
		term.term[field] = value;
		let query = {
			bool: {
				must_not: [term],
			}
		};
		return query;
	}
	/ value:num _ '≠' _ field:field
	{
		let term = {
			term: {}
		}
		term.term[field] = value;
		let query = {
			bool: {
				must_not: [term],
			}
		};
		return query;
	}
	/ value:num _ '>' _ field:field
	{
		let query = {
			range: {}
		};
		query.range[field] = {
			lt: value,
		};
		return query;
	}
	/ value:num _ '>=' _ field:field
	{
		let query = {
			range: {}
		};
		query.range[field] = {
			lte: value,
		};
		return query;
	}
	/ value:num _ '≥' _ field:field
	{
		let query = {
			range: {}
		};
		query.range[field] = {
			lte: value,
		};
		return query;
	}
	/ value:num _ '<' _ field:field
	{
		let query = {
			range: {}
		};
		query.range[field] = {
			gt: value,
		};
		return query;
	}
	/ value:num _ '<=' _ field:field
	{
		let query = {
			range: {}
		};
		query.range[field] = {
			gte: value,
		};
		return query;
	}
	/ value:num _ '≤' _ field:field
	{
		let query = {
			range: {}
		};
		query.range[field] = {
			gte: value,
		};
		return query;
	}
	/ 'NOT' _ rule:rule
	{
		let query = {
			bool: {
				must_not: rule
			}
		}
		return query;
	}
	/ value:phrase _ field:field
	{
		// TODO from here down
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
