"use strict";

import React from 'react';
import ReactDOM from 'react-dom';
import Autosuggest from 'react-autosuggest';
import {Button, Modal, Checkbox, FormGroup, Radio} from 'react-bootstrap';
import d3 from 'd3';
import * as venn from 'venn.js';

import {QueryStatsPanel} from './ui/QueryStatsPanel.tsx';

import {iframeResizerContentWindow} from 'iframe-resizer';
import synthyParser from './synthyParser.pegjs';
import {Dropdown, DropdownList, DropdownListFind, DropdownListOption} from './Dropdown.tsx';
import {GraphSlider} from './graphSlider.jsx';
import {elastic_count, get_schema, get_suggestions} from './Genestation.js';

import '../css/vendor/query-builder.default.min.css';
import '../css/graphslider.css';
import '../css/autosuggest.css';
import '../css/synthy.css';

var QueryBuilderRule = React.createClass({
	getInitialState: function() {
		return {
			error: "",
			suggestions: [],
		};
	},
	componentDidUpdate: function(prevProps, prevState) {
		var query = parseQueryObject({
			field: this.props.field,
			operator: this.props.operator,
			value: this.props.value,
			complement: this.props.complement,
		});
		elastic_count(this.props.elastic, this.state.scope, [query])
		.then((counts)=>{
			var count = counts[0];
			if(count === 0 && this.state.error.length === 0) {
				this.setState({
					error: "Empty set",
				});
			} else if (count > 0 && this.state.error === "Empty set") {
				this.setState({
					error: "",
				});
			}
		});
	},
	deleteRule: function(event) {
		this.props.deleteRule([this.props.index]);
	},
	setComplement: function(event) {
		this.props.alterRule({
			field: this.props.field,
			operator: this.props.operator,
			value: this.props.value,
			complement: !this.props.complement,
			id: this.props.id,
		},[this.props.index]);
	},
	setField: function(field) {
		var schema = this.props.schema.fields[this.props.schema.scope][field];
		var operator = this.props.schema.operators.find(
			(operator)=>operator.apply_to.includes(schema.type)).type;
		var value = "";
		if(['long', 'integer', 'short', 'byte', 'double', 'float', 'half_float', 'scaled_float', 'date'].includes(schema.type)) {
			if(schema.min != schema.max) {
				value = (schema.min+schema.max)/2;
			} else {
				value = schema.min;
			}
		}
		this.props.alterRule({
			field: field,
			operator: operator,
			value: value,
			complement: this.props.complement,
			id: this.props.id,
		},[this.props.index]);
	},
	setOperator: function(event) {
		this.props.alterRule({
			field: this.props.field,
			operator: event.target.value,
			value: this.props.value,
			complement: this.props.complement,
			id: this.props.id,
		},[this.props.index]);
	},
	setValueEvent: function(event,{newValue}) {
		this.setValue(newValue);
	},
	setValue: function(value) {
		if(["text","keyword"].includes(this.props.schema.fields[this.props.schema.scope][this.props.field].type)) {
			this.updateSuggestions(value);
		}
		this.props.alterRule({
			field: this.props.field,
			operator: this.props.operator,
			value: value,
			complement: this.props.complement,
			id: this.props.id,
		},[this.props.index]);
	},
	updateSuggestions: function(query) {
		if(!query.length && this.state.suggestions.length > 0) {
			this.setState({
				suggestions: []
			});
		} else {
			this.setState({
				suggestions: [], // TODO
			});
		}
	},
	onSuggestionUpdateRequested: function({value}) {
		this.updateSuggestions(value);
	},
	fieldElement: function() {
		return (
			<div className="rule-filter-container col-sm-3">
				<select className="form-control"
					onChange={(event)=>this.setField(event.target.value)}
					value={this.props.field}>
					{Object.keys(this.props.schema.fields[this.props.schema.scope]).sort()
						.map((field, idx)=>{
							return (
								<option key={idx} value={field}>
									{field}
								</option>
							);
						})
					}
				</select>
			</div>
		);
	},
	valueElement: function() {
		if(!this.props.field || !this.props.operator) {
			return;
		}
		var field=this.props.schema.fields[this.props.schema.scope][this.props.field];
		var nb_inputs = this.props.schema.operators.find((operator)=>operator.type == this.props.operator).nb_inputs;
		var fields = [];
		for(var i = 0; i < nb_inputs; i++) {
			switch(field.type) {
			case "text":
			case "keyword":
			case "date":
				fields.push(
					<Autosuggest
						key={i}
						id={"autosuggest" + this.props.id + '.' + i}
						suggestions={this.state.suggestions}
						onSuggestionsUpdateRequested={this.onSuggestionUpdateRequested}
						getSuggestionValue={function(suggestion) {
							return suggestion;
						}}
						renderSuggestion={function(suggestion) {
							return <span>{suggestion}</span>;
						}}
						inputProps={{
							value: this.props.value,
							onChange: this.setValueEvent,
							type: "search",
							className: "form-control",
						}}/>
				);
				break;
			case "long":
			case "integer":
			case "short":
			case "byte":
			case "double":
			case "float":
			case "half_float":
			case "scaled_float":
				fields.push(
					<GraphSlider
						key={i}
						id={"graphslider" + this.props.id + '.' + i}
						value={this.props.value}
						min={field.min}
						max={field.max}
						avg={field.avg}
						stdDev={field.std_deviation}
						buckets={field.histogram}
						steps={100}
						onUpdate={this.setValue}
						index={this.props.index}
						highlightLower={
							["less","less_or_equal","not_equal"].indexOf(this.props.operator) > -1?
							true:false}
						highlightUpper={
							["greater","greater_or_equal","not_equal"].indexOf(this.props.operator) > -1?
							true:false}
						highlightBound={
							["equal","less_or_equal","greater_or_equal"].indexOf(this.props.operator) > -1?
							true:false}
					/>
				);
				break;
			}
		}
		return (
			<div className="rule-value-container col-sm-5">
				{fields}
			</div>
		);
	},
	operatorElement: function() {
		if(!this.props.field) {
			return;
		}
		return (
			<div className="rule-operator-container col-sm-2">
				<select className="form-control"
					onChange={this.setOperator}
					value={this.props.operator}>
					{this.props.schema.operators.filter((operator)=>{
							return operator.apply_to.includes(
								this.props.schema.fields[this.props.schema.scope][this.props.field].type)
						}).map((operator, idx)=>{
							return (
								<option key={idx} value={operator.type}>
									{operator.type.replace(/_/g," ")}
								</option>
							);
						})
					}
				</select>
			</div>
		)
	},
	render: function() {
		var self = this;
		return (
			<li className={"rule-container "+(this.state.error.length>0?"has-error":"")}>
				<div className="rule-header">
					<div className="pull-right rule-actions">
						<div className="onoffswitch"
							onClick={this.setComplement}
							>
							<input type="checkbox" name="onoffswitch" className="onoffswitch-checkbox"
								checked={this.props.complement} readOnly
							/>
							<label className="onoffswitch-label" for="onoffswitch">
								<div className="onoffswitch-inner"></div>
								<span className="onoffswitch-switch"></span>
							</label>
						</div>
						<button type="button" className="btn btn-xs btn-link btn-exit"
							onClick={this.deleteRule}
							>
							<i className="glyphicon glyphicon-remove"></i>
						</button>
					</div>
				</div>
				<div className="error-container">
					<i className="glyphicon glyphicon-warning-sign"></i> &nbsp;
					{this.state.error}
				</div>
				<div className="rule-components row">
					{this.fieldElement()}
					{this.operatorElement()}
					{this.valueElement()}
				</div>
			</li>
		);
	}
});

var QueryBuilderGroupCondition = React.createClass({
	render: function() {
		var active = "btn btn-xs btn-primary active"
		var inactive = "btn btn-xs btn-primary"
		return (
			<div className="btn-group" role="group" aria-label="condition">
				<button type="button"
					className={this.props.condition==="AND"?active:inactive}
					onClick={this.props.setCondition.bind(null,"AND",[])}
					>AND</button>
				<button type="button"
					className={this.props.condition==="OR"?active:inactive}
					onClick={this.props.setCondition.bind(null,"OR",[])}
					>OR</button>
			</div>
		);
	}
});

var QueryBuilderGroup = React.createClass({
	setCondition: function(condition,path) {
		if(this.props.hasOwnProperty("index")) {
			path.unshift(this.props.index);
		}
		this.props.setCondition(condition,path);
	},
	setComplement: function(complement,path) {
		if(this.props.hasOwnProperty("index")) {
			path.unshift(this.props.index);
		}
		this.props.setComplement(complement,path);
	},
	alterRule: function(rule,path) {
		if(this.props.hasOwnProperty("index")) {
			path.unshift(this.props.index);
		}
		this.props.alterRule(rule,path);
	},
	addRule: function(path) {
		if(this.props.hasOwnProperty("index")) {
			path.unshift(this.props.index);
		}
		this.props.addRule(path);
	},
	addGroup: function(path) {
		if(this.props.hasOwnProperty("index")) {
			path.unshift(this.props.index);
		}
		this.props.addGroup(path);
	},
	deleteRule: function(path) {
		if(this.props.hasOwnProperty("index")) {
			path.unshift(this.props.index);
		}
		this.props.deleteRule(path);
	},
	render: function() {
		return (
			<dl className="rules-group-container">
				<dt className="rules-group-header">
					<div className="pull-right group-actions">
						<div className="onoffswitch"
							onClick={this.props.setComplement.bind(null,!this.props.complement,[])}
							>
							<input type="checkbox" name="onoffswitch" className="onoffswitch-checkbox"
								checked={this.props.complement}
							/>
							<label className="onoffswitch-label" for="onoffswitch">
								<div className="onoffswitch-inner"></div>
								<span className="onoffswitch-switch"></span>
							</label>
						</div>
						{
							this.props.hasOwnProperty("index")?
							<button type="button" className="btn btn-xs btn-link btn-exit"
								onClick={this.props.deleteRule.bind(null,[this.props.index])}>
								<i className="glyphicon glyphicon-remove"></i>
							</button>
							:null
						}
					</div>
					<QueryBuilderGroupCondition
						setCondition={this.setCondition}
						condition={this.props.condition}/>
				</dt>
				<dd className="rules-group-body">
					<ul className="rules-list">
						{this.props.rules.map(function(item,idx,array) {
							if(item.hasOwnProperty('rules')) {
								return (
									<QueryBuilderGroup
										elastic={this.props.elastic}
										addRule={this.addRule}
										addGroup={this.addGroup}
										setCondition={this.setCondition}
										setComplement={this.setComplement}
										alterRule={this.alterRule}
										deleteRule={this.deleteRule}
										schema={this.props.schema}
										key={item.id}
										id={item.id}
										index={idx}
										complement={item.complement?true:false}
										condition={item.condition}
										rules={item.rules}/>
								);
							} else {
								return (
									<QueryBuilderRule
										elastic={this.props.elastic}
										alterRule={this.alterRule}
										deleteRule={this.deleteRule}
										schema={this.props.schema}
										key={item.id}
										id={item.id}
										index={idx}
										complement={item.complement?true:false}
										field={item.field}
										operator={item.operator}
										value={item.value}/>
								);
							}
						},this)}
						<li className="rule-container" style={{width:"40px",background:"none"}}>
							<button type="button" className="btn btn-xs btn-default"
								onClick={this.addRule.bind(null,[this.props.rules.length])}>
								<i className="glyphicon glyphicon-plus"></i>
								&nbsp;Rule
							</button>
							<button type="button" className="btn btn-xs" style={{backgroundColor:"rgb(220,200,150)"}}
								onClick={this.addGroup.bind(null,[this.props.rules.length])}>
								<i className="glyphicon glyphicon-plus"></i>
								&nbsp;Group
							</button>
						</li>
					</ul>
				</dd>
			</dl>
		);
	}
});

var QueryBuilderCore = React.createClass({
	setCondition: function(condition,path) {
		var rules = this.props.rules;
		var ptr = rules;
		path.forEach(function(item) {
			ptr = ptr.rules[item];
		});
		ptr.condition = condition;
		this.props.setRules(rules);
	},
	setComplement: function(complement,path) {
		var rules = this.props.rules;
		var ptr = rules;
		path.forEach(function(item) {
			ptr = ptr.rules[item];
		});
		ptr.complement = complement;
		this.props.setRules(rules);
	},
	addRule: function(path) {
		var rules = this.props.rules;
		var ptr = rules;
		var last = null;
		path.forEach(function(item) {
			if(last !== null) {
				ptr = ptr.rules[last];
			}
			last = item;
		});

		let field = Object.keys(this.props.fields[this.props.scope])[0];
		let schema = this.props.fields[this.props.scope][field];
		let operator = this.props.operators.find(
			(operator)=>operator.apply_to.includes(schema.type)).type;
		var value = "";
		if(['long', 'integer', 'short', 'byte', 'double', 'float', 'half_float', 'scaled_float', 'date'].includes(schema.type)) {
			if(schema.min != schema.max) {
				value = (schema.min+schema.max)/2;
			} else {
				value = schema.min;
			}
		}
		ptr.rules[last] = {
			field: field,
			operator: operator,
			value: value,
			id: this.props.nextKey(),
		};
		this.props.setRules(rules);
	},
	addGroup: function(path) {
		var rules = this.props.rules;
		var ptr = rules;
		var last = null;
		path.forEach(function(item) {
			if(last !== null) {
				ptr = ptr.rules[last];
			}
			last = item;
		});
		ptr.rules[last] = {
			condition: "AND",
			rules:[],
			id: this.props.nextKey(),
		};
		this.props.setRules(rules);
	},
	alterRule: function(rule,path) {
		var rules = this.props.rules;
		var ptr = rules;
		var last = null;
		path.forEach(function(item) {
			if(last !== null) {
				ptr = ptr.rules[last];
			}
			last = item;
		});
		ptr.rules[last] = rule;
		this.props.setRules(rules);
	},
	deleteRule: function(path) {
		var rules = this.props.rules;
		var ptr = rules;
		var last = null;
		path.forEach(function(item) {
			if(last !== null) {
				ptr = ptr.rules[last];
			}
			last = item;
		});
		ptr.rules.splice(last,1);
		this.props.setRules(rules);
	},
	render: function() {
		var schema = {
			scope: this.props.scope,
			operators: this.props.operators,
			fields: this.props.fields,
		};

		return (
			<div className="query-builder">
				<QueryBuilderGroup
					elastic={this.props.elastic}
					setCondition={this.setCondition}
					setComplement={this.setComplement}
					addRule={this.addRule}
					addGroup={this.addGroup}
					alterRule={this.alterRule}
					deleteRule={this.deleteRule}
					schema={schema}
					complement={this.props.rules.complement?true:false}
					condition={this.props.rules.condition}
					rules={this.props.rules.rules}/>
			</div>
		);
	}
});

var VennDiagram = React.createClass({
	componentDidMount: function() {
		if (this.props.sets.length > 0) {
			var node = d3.select(ReactDOM.findDOMNode(this.refs.venn))
			var tooltip = d3.select(ReactDOM.findDOMNode(this.refs.tooltip));
			node.datum(this.props.sets).call(venn.VennDiagram())
			node.selectAll("svg")
			    .style("display", "block")
			    .style("margin", "auto")
			node.selectAll("path")
			    .style("stroke-opacity", 0)
			    .style("stroke", "#fff")
			    .style("stroke-width", 0)

			var that = this;
			// add listeners to all the groups to display tooltip on mousover
			node.selectAll("g")
				.style("cursor", "pointer")
				.on("mouseover", function(d, i) {
					// sort all the areas relative to the current item
					venn.sortAreas(node, d);

					// Display a tooltip
					tooltip.transition().duration(400).style("opacity", .9);
					tooltip.html(that.props.tooltip(d,i));

					// highlight the current path
					var selection = d3.select(this).transition("tooltip").duration(400);
					selection.select("path")
						.style("stroke-width", 3)
						.style("fill-opacity", d.sets.length == 1 ? .4 : .1)
						.style("stroke-opacity", 1);
				})
				.on("mousemove", function() {
					tooltip.style("left", (d3.event.pageX) + "px")
						.style("top", (d3.event.pageY - 50) + "px");
				})
				.on("mouseout", function(d, i) {
					tooltip.transition().duration(400).style("opacity", 0);
					var selection = d3.select(this).transition("tooltip").duration(400);
					selection.select("path")
						.style("stroke-width", 0)
						.style("fill-opacity", d.sets.length == 1 ? .25 : .0)
						.style("stroke-opacity", 0);
				})
				.on("click", function(d, i) {
					that.props.onClick(d,i);
				});
		}
	},
	componentDidUpdate: function() {
		var node = ReactDOM.findDOMNode(this.refs.venn);
		while(node.hasChildNodes()) {
			node.removeChild(node.lastChild);
		}
		this.componentDidMount();
	},
	render: function() {
		var tooltipStyle = {
			background: "#333",
			color: "#DDD",
			padding: "2px 5px",
			opacity: 0,
			borderRadius: "2px",
			position: "absolute",
			pointerEvents: "none",
		};
		return (
			<div className="venn-container">
				<div ref="venn"></div>
				<div ref="legend"></div>
				<div ref="tooltip" style={tooltipStyle}></div>
			</div>
		);
	}
});

// Helper functions
function getQueryParams(qs) {
    qs = qs.split('+').join(' ');

    var params = {},
	tokens,
	re = /[?&]?([^=]+)=([^&]*)/g;

    while (tokens = re.exec(qs)) {
	params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
    }

    return params;
}
function combinations(arr) {
	var fn = function(active, rest, a) {
		if (!active.length && !rest.length)
			return;
		if (!rest.length) {
			a.push(active);
		} else {
			fn(active.concat([rest[0]]), rest.slice(1), a);
			fn(active, rest.slice(1), a);
		}
		return a;
	}
	return fn([], arr, []);
}
function intersect(a, b) {
	var t;
	if (b.length > a.length) t = b, b = a, a = t; // indexOf to loop over shorter
	return a.filter(function (e) {
		if (b.indexOf(e) !== -1) return true;
	});
}
function parseQueryObjectChild(result) {
	return parseQueryObject(result,false);
}
function parseQueryObject(result, root) {
	if (root === undefined) {
		root = true;
	}
	if (result.rules) {
		var output = result.rules
			.map(parseQueryObjectChild)
			.join(' ' + result.condition + ' ');
		if (root && !result.complement) {
			return output;
		} else {
			return (result.complement?"NOT ":"") + '(' + output + ')';
		}
	} else if (result.field) {
		var operator;
		switch(result.operator) {
		case 'exists':
			return (result.complement?"NOT ":"") + ' _exists_:' + result.field;
		case 'match':
			let esc_val = result.value.replace('"','\\"');
			if (result.field === '') {
				return (result.complement?"NOT ":"") + '"' + esc_val + '"';
			} else {
				return (result.complement?"NOT ":"") + result.field + ':"' + esc_val + '"';
			}
		case 'equal':
			operator = '=';
			break;
		case 'less':
			operator = '<';
			break;
		case 'less_or_equal':
			operator = '<=';
			break;
		case 'greater':
			operator = '>';
			break;
		case 'greater_or_equal':
			operator = '>=';
			break;
		}
		return (result.complement?"NOT ":"") + result.field + ':' + operator + result.value
	}
}

class QueryBuilder extends React.Component {
	nextKey = ()=>{
		return this.currKey++;
	}
	constructor(props) {
		super(props)
		this.currKey = 0;
		var urlQuery = getQueryParams(window.parent.document.location.search);
		var query = {};
		if(this.props.queryVar && urlQuery.hasOwnProperty(this.props.queryVar)) {
			try {
				query = synthyParser.parse(urlQuery[this.props.queryVar]);
				this.currKey = query.currKey;
			} catch (err) {
				console.log(err)
			}
		}
		this.state = {
			rules: query.rules?query.rules:{
				condition: "AND",
				rules: [],
			},
			groups: [],
			venn: [],
			scope: query.scope?query.scope:props.scopes[0],
		};
	}
	componentDidMount = ()=>{
		window.parent.addEventListener("popstate", (event)=>{
			if(event.state && event.state.hasOwnProperty("query")) {
				try {
					var query = synthyParser.parse(event.state.query);
					this.currKey = query.currKey;
					this.setScope(query.scope);
					this.setRules(query.rules);
				} catch (err) {
					console.log(err)
				}
			} else {
				// Get initial state
				var urlQuery = getQueryParams(window.parent.document.location.search);
				var query = {};
				if(this.props.queryVar && urlQuery.hasOwnProperty(this.props.queryVar)) {
					try {
						query = synthyParser.parse(urlQuery[this.props.queryVar]);
						this.currKey = query.currKey;
					} catch (err) {
						console.log(err)
					}
				}
				this.setState({
					rules: query.rules?query.rules:{
						condition: "AND",
						rules: [],
					},
					venn: [],
					scope: query.scope?query.scope:"gene/homo/sapiens",
				});
			}
		});
		this.updateVenn();
	}
	submitQuery = (action, query)=>{
		if (query === undefined) {
			query = parseQueryObject(this.state.rules);
		}
		if(action.hasOwnProperty("dialog") && (action.dialog.format || action.dialog.fields) ) {
			// Display dialog
			this.setState({
				currAction: action,
			});
		} else {
			this.performAction(action);
		}
	}
	cancelAction = ()=>{
		this.setState({
			currAction: null,
		});
	}
	performAction = (action, format, fields, pretty)=>{
		let query = parseQueryObject(this.state.rules);
		var queryString = this.props.queryVar + "=" + encodeURIComponent(this.scopeQuery(query));
		if(!window.parent.history.state || window.parent.history.state.query != query) {
			window.parent.history.pushState({query:query}, "",
				window.parent.location.pathname +"?" + queryString);
		}
		for(var key in action.options) {
			if(!action.options.hasOwnProperty(key)) continue;

			var value = action.options[key];
			if(typeof value === 'string') {
				queryString += "&" + key + "=" + encodeURIComponent(value);
			} else if (Array.isArray(value)) {
				queryString += "&" + key + "=" + value.map(item => encodeURIComponent(item)).join('&' + key + '=');
			}
		}
		if(pretty && (!format || format == "json")) {
			queryString += "&pretty";
		}
		if(format) {
			queryString += "&format=" + encodeURIComponent(format);
		}
		if(fields) {
			queryString += "&fields=" + fields.map(item => encodeURIComponent(item)).join('&fields=');
		}
		let url = "/json/_search?" + queryString;
		if(action.format) {
			url += "&format=" + encodeURIComponent(action.format);
		}
		if(action.fields) {
			url += "&fields=" + action.fields.map(item => encodeURIComponent(item)).join('&fields=');
		}
		if(typeof action.action == 'boolean' && action.action) {
			window.parent.postMessage({label: action.label, url:url, query:query, format: format, fields: fields},window.location.origin);
		} else {
			queryString += "&url=" + encodeURIComponent(url);
			window.parent.location.href = action.action + "?" + queryString;
		}
	}
	scopeQuery = (query)=>{
		return '@' + this.state.scope + '  ' + query;
	}
	parseQueryGroups = (result)=>{
		return result.rules.map(parseQueryObject)
			.map(function(element, index) {
				return {query: element, id: index}
			})
	}
	updateVenn = ()=>{
		let groups = this.parseQueryGroups(this.state.rules);
		this.setState({
			groups: groups.map((group)=>group.query),
		});
		var regions = combinations(groups);
		if (!regions) {
			regions = [[{id:0,query:""}]]
		}
		var vennSet = [];
		for (var index = 0; index < regions.length; index++) {
			var sets = regions[index].map((e)=>e.id)
			var query = regions[index].map((e)=>e.query).join(' AND ')
			var label = ""
			if (sets.length === 1) {
				if (query.length ===0) {
					label = '@' + this.state.scope;
				} else {
					label = query;
				}
			}
			vennSet.push({
				sets: sets,
				label: label,
				query: query,
			});
		}
		elastic_count(this.props.elastic, this.state.scope, vennSet.map((venn)=>venn.query))
		.then((counts)=>{
			counts.forEach((count, idx)=>{vennSet[idx].size = count});
			let zeroes = vennSet.filter((set)=>{return set.sets.length === 1 && set.size === 0})
				.map((set)=>{set.sets[0]})
			this.setState({
				venn: vennSet.filter((set)=>{
					return intersect(set.sets,zeroes).length === 0;
				})
			});
		});
	}
	setScope = (scope)=>{
		if(scope === null) {
			scope = "gene/homo/sapiens";
		}
		this.setState({
			scope: scope,
		});
		this.updateVenn();
	}
	setRules = (rules)=>{
		if(rules === null) {
			rules = {
				condition: "AND",
				rules: [],
			};
		}
		this.setState({
			rules: rules,
		});
		this.updateVenn();
	}
	render() {
		return (
			<div className="query-builder-container">
				<Dropdown className="selectcontrol-element" label="Index"
					value={this.state.scope}>
					<DropdownList options={this.props.scopes.map((scope)=>{return {label: scope, value: scope}})}
						onChange={(option)=>{this.setScope(option.value)}} />
				</Dropdown>
				<div className="query-builder-analyzer">
					<VennDiagram ref="venn" sets={this.state.venn}
						tooltip={function(d,i) {
							return (d.query.length?d.query:d.label) + "<br>" + d.size + " hits";
						}}
						onClick={function(d,i) {
							this.submitQuery(this.props.actions[0], d.query);
						}.bind(this)}
					/>
					<QueryStatsPanel
						elastic={this.props.elastic}
						index={this.state.scope}
						groups={this.state.groups}
					/>
				</div>
				<QueryBuilderCore ref="builder"
					elastic={this.props.elastic}
					scope={this.state.scope}
					operators={this.props.operators}
					fields={this.props.fields}
					rules={this.state.rules}
					setRules={this.setRules}
					nextKey={this.nextKey}
				/>
				{this.props.actions.map(function(item,idx) {
					return (
						<button key={idx} className={"btn "+item.style}
							onClick={this.submitQuery.bind(null, item, undefined)}>
							{item.label}
						</button>
					)
				},this)}
			</div>
		);
	}
}

export function init(element, options) {
	var contentLoaded, messagePosted, schemaLoaded = false;
	options.operators = [
		{type: 'match', nb_inputs: 1, multiple: false,
			apply_to: ['text', 'keyword']},
		{type: 'less', nb_inputs: 1, multiple: false,
			apply_to: ['long', 'integer', 'short', 'byte', 'double', 'float', 'half_float', 'scaled_float', 'date']},
		{type: 'less_or_equal', nb_inputs: 1, multiple: false,
			apply_to: ['long', 'integer', 'short', 'byte', 'double', 'float', 'half_float', 'scaled_float', 'date']},
		{type: 'greater', nb_inputs: 1, multiple: false,
			apply_to: ['long', 'integer', 'short', 'byte', 'double', 'float', 'half_float', 'scaled_float', 'date']},
		{type: 'greater_or_equal', nb_inputs: 1, multiple: false,
			apply_to: ['long', 'integer', 'short', 'byte', 'double', 'float', 'half_float', 'scaled_float', 'date']},
		{type: 'equal', nb_inputs: 1, multiple: false,
			apply_to: ['long', 'integer', 'short', 'byte', 'double', 'float', 'half_float', 'scaled_float', 'date', 'boolean']},
		{type: 'exists', nb_inputs: 0, multiple: false,
			apply_to: ['text', 'keyword', 'long', 'integer', 'short', 'byte', 'double', 'float', 'half_float', 'scaled_float', 'date', 'boolean']},
	];

	options.actions = options.actions.map((item) => {
		if(typeof item.action == 'function') {
			actions[item.label] = item.action;
			item.action=true;
		}
		return item;
	});
	get_schema(options.elastic, options.scopes)
	.then((schema)=>{
		options.fields=schema;
		schemaLoaded = true;
		renderIfReady();
	});

	document.addEventListener("DOMContentLoaded", function(event) {
		contentLoaded = true;
		renderIfReady();
	});

	function render() {
		ReactDOM.render(React.createElement(QueryBuilder, options), element);
	}
	function renderIfReady() {
		if(contentLoaded && schemaLoaded) {
			render();
		}
	}

}
