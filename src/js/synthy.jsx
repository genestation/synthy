"use strict";

import React from 'react';
import ReactDOM from 'react-dom';
import Autosuggest from 'react-autosuggest';
import {SimpleSelect} from 'react-selectize';
import {Button, Modal, Checkbox, FormGroup, Radio} from 'react-bootstrap';
import d3 from 'd3';
import venn from 'venn.js';
import {iframeResizerContentWindow} from 'iframe-resizer';
import synthyParser from './synthyParser.pegjs';

import '../css/vendor/query-builder.default.min.css';
import '../css/graphslider.css';
import '../css/autosuggest.css';
import '../css/synthy.css';

var GraphSlider = React.createClass({
	getDefaultProps: function() {
		return {
			highlightLower: false,
			highlightUpper: false,
			highlightBound: false,
		};
	},
	onUpdateEvent: function(event) {
		this.props.onUpdate(event.target.value);
	},
	discretize: function(value) {
		if(value < this.props.max && value > this.props.min) {
			value = Math.round(value/this.props.step)*this.props.step;
			var magnitude = Math.log10(this.props.step);
			var output = "";
			if(magnitude < 0) {
				output = value.toFixed(Math.abs(magnitude));
			} else {
				output = value.toFixed(0);
			}
			return output;
		} else {
			return value;
		}
	},
	componentWillMount: function() {
		this.margin = {top: 20, right: 10, bottom: 20, left: 10},
		this.width = 350 - this.margin.left - this.margin.right,
		this.height = 80 - this.margin.bottom - this.margin.top;

		this.xScale = d3.scale.linear()
			.domain([this.props.min, this.props.max])
			.range([0, this.width])
			.clamp(true);
		this.yScale = d3.scale.linear()
			.domain([0,d3.max(this.props.buckets,function(bucket) {
				return bucket.count;
			})])
			.range([0,this.height]);

		var that = this;
		this.area = d3.svg.area()
			.x(function(d) { return that.xScale(d.bucket); })
			.y(function(d) { return that.height-that.yScale(d.count)-5; })
			.y0(function(d) { return that.height; });
		this.line = d3.svg.line()
			.x(function(d) { return that.xScale(d.bucket); })
			.y(function(d) { return that.height-that.yScale(d.count)-5; });

		this.brush = d3.svg.brush()
			.x(this.xScale)
			.extent([0, 0])
			.on("brush", function() {
				if (d3.event.sourceEvent) { // not a programmatic event
					var value = that.discretize(
						that.xScale.invert(d3.mouse(this)[0]));
					that.brush.extent([parseFloat(value), parseFloat(value)]);
					var pos = that.xScale(parseFloat(value));
					d3.select(ReactDOM.findDOMNode(that.refs.handle)).
						attr("cx", pos);
					d3.select(ReactDOM.findDOMNode(that.refs.maskLower)).
						attr("x", -that.width+pos);
					ReactDOM.findDOMNode(that.refs.input).value = value;
					d3.select(ReactDOM.findDOMNode(that.refs.maskUpper)).
						attr("x", pos);
					d3.select(ReactDOM.findDOMNode(that.refs.maskBound)).
						attr("x1", pos).
						attr("x2", pos);
					ReactDOM.findDOMNode(that.refs.input).value = value;
				}
			})
			.on("brushend", function() {
				if (d3.event.sourceEvent) { // not a programmatic event
					var value = that.discretize(
						that.xScale.invert(d3.mouse(this)[0]));
					that.brush.extent([parseFloat(value), parseFloat(value)]);
					if(value != that.props.value) {
						that.props.onUpdate(value);
					}
				}
			});

		this.xAxis = d3.svg.axis()
			.scale(this.xScale)
			.orient("bottom")
			.ticks(4)
			.tickSize(0)
			.tickPadding(10);
	},
	componentDidMount: function() {
		var that = this;
		d3.select(ReactDOM.findDOMNode(this.refs.area))
			.datum(this.props.buckets)
			.attr("d",this.area);
		d3.select(ReactDOM.findDOMNode(this.refs.highlightLower))
			.datum(this.props.buckets)
			.attr("d",this.area);
		d3.select(ReactDOM.findDOMNode(this.refs.highlightUpper))
			.datum(this.props.buckets)
			.attr("d",this.area);
		d3.select(ReactDOM.findDOMNode(this.refs.highlightBound))
			.datum(this.props.buckets)
			.attr("d",this.area);

		d3.select(ReactDOM.findDOMNode(this.refs.line))
			.datum(this.props.buckets)
			.attr("d",this.line);

		d3.select(ReactDOM.findDOMNode(this.refs.xaxis))
			.call(this.xAxis)
			.select(".domain")
			.select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
			.attr("class", "halo");

		this.slider = d3.select(ReactDOM.findDOMNode(this.refs.slider))
			.call(this.brush);

		this.slider.selectAll(".extent,.resize")
			.remove();

		this.slider.select(".background")
			.style("stroke", "black")
			.attr("height", this.height+this.margin.bottom+this.margin.top)
			.attr("y", -this.margin.top)
			.on("mouseover", function() {
				// Display cursor
				d3.select(ReactDOM.findDOMNode(that.refs.cursor))
					.transition().duration(400).style("stroke-opacity", .6);
			})
			.on("mousemove", function() {
				d3.select(ReactDOM.findDOMNode(that.refs.cursor))
					.attr("x1",d3.mouse(this)[0])
					.attr("x2",d3.mouse(this)[0]);
			})
			.on("mouseout", function() {
				d3.select(ReactDOM.findDOMNode(that.refs.cursor))
					.transition().duration(400).style("stroke-opacity", 0);
			});

		if(this.props.hasOwnProperty("value")) {
			this.slider
				.call(this.brush.extent([this.props.value, this.props.value]))
				.call(this.brush.event);
		}
	},
	componentDidUpdate: function() {
		this.xScale.domain([this.props.min, this.props.max]);
		this.yScale.domain([0,d3.max(this.props.buckets,function(bucket) {
				return bucket.count;
			})]);
		d3.select(ReactDOM.findDOMNode(this.refs.xaxis)).call(this.xAxis);
		d3.select(ReactDOM.findDOMNode(this.refs.area))
			.datum(this.props.buckets)
			.attr("d",this.area);
		d3.select(ReactDOM.findDOMNode(this.refs.highlightLower))
			.datum(this.props.buckets)
			.attr("d",this.area);
		d3.select(ReactDOM.findDOMNode(this.refs.highlightUpper))
			.datum(this.props.buckets)
			.attr("d",this.area);
		d3.select(ReactDOM.findDOMNode(this.refs.highlightBound))
			.datum(this.props.buckets)
			.attr("d",this.area);

		d3.select(ReactDOM.findDOMNode(this.refs.line))
			.datum(this.props.buckets)
			.attr("d",this.line);
		if(this.props.hasOwnProperty("value")) {
			this.slider.call(
				this.brush.extent([this.props.value, this.props.value])
			);
		}
	},
	render: function() {
		return (
			<div className="graph-slider-container row">
				<div className="col-sm-3">
					<input ref="input" type="number" className="form-control"
						onChange={this.onUpdateEvent}
						min={Math.floor(this.props.min/this.props.step)*this.props.step}
						max={Math.floor(this.props.max/this.props.step)*this.props.step}
						step={this.props.step}
						value={this.props.value}/>
				</div>
				<div className="graph-slider col-sm-9">
					<svg
						width={this.width + this.margin.left + this.margin.right}
						height={this.height + this.margin.top + this.margin.bottom}
					>
						<defs>
							<linearGradient id="gradientLower" x1="0%">
								<stop offset="95%" stopColor="white"></stop>
								<stop offset="100%" stopColor="grey"></stop>
							</linearGradient>
							<linearGradient id="gradientUpper" x1="0%">
								<stop offset="0%" stopColor="grey"></stop>
								<stop offset="5%" stopColor="white"></stop>
							</linearGradient>
							<mask id={"maskLower-" + this.props.id} x="0" y="0" width={this.width} height={this.height} >
								<rect ref="maskLower"
									x={this.props.hasOwnProperty("value")?-this.width+this.xScale(this.props.value):-this.width}
									y={-this.margin.top}
									width={this.width}
									height={this.height+this.margin.top}
									style={{
										stroke: "none ",
										fill: this.props.highlightBound?"white":"url(#gradientLower)",
									}}></rect>
							</mask>
							<mask id={"maskUpper-" + this.props.id} x="0" y="0" width={this.width} height={this.height} >
								<rect ref="maskUpper"
									x={this.props.hasOwnProperty("value")?this.xScale(this.props.value):0}
									y={-this.margin.top}
									width={this.width}
									height={this.height+this.margin.top}
									style={{
										stroke: "none ",
										fill: this.props.highlightBound?"white":"url(#gradientUpper)",
									}}></rect>
							</mask>
							<mask id={"maskBound-" + this.props.id} x="0" y="0" width={this.width} height={this.height} >
								<line ref="maskBound"
									x1={this.props.hasOwnProperty("value")?this.xScale(this.props.value):0}
									y1={-this.margin.top}
									x2={this.props.hasOwnProperty("value")?this.xScale(this.props.value):0}
									y2={this.height+this.margin.top}
									stroke="white"
									strokeWidth="2"/>
							</mask>
						</defs>
						<g transform={"translate(" + this.margin.left + "," + this.margin.top + ")"}>
							<path ref="area" style={{fill: "rgb(128,128,128)"}}></path>
							<path ref="highlightLower"
								style={{
									display: this.props.highlightLower?"inline":"none",
									fill: "rgb(50,90,250)",
									mask: "url(#maskLower-" + this.props.id + ")"
								}}></path>
							<path ref="highlightUpper"
								style={{
									display: this.props.highlightUpper?"inline":"none",
									fill: "rgb(50,90,250)",
									mask: "url(#maskUpper-" + this.props.id + ")"
								}}></path>
							<path ref="highlightBound"
								style={{
									display: this.props.highlightBound?"inline":"none",
									fill: "rgb(50,90,250)",
									mask: "url(#maskBound-" + this.props.id + ")"
								}}></path>
							<path ref="line" style={{stroke: "rgb(0,0,0)", fill: "none"}}></path>
							<g ref="xaxis" className="x axis" transform={"translate(0,"+this.height+")"}></g>
							<g ref="slider" className="slider">
								<line ref="cursor"
									x1="0" y1={this.height-5}
									x2="0" y2={-this.margin.top/2}
									style={{stroke: "rgb(50,90,250)", fill: "none", "strokeOpacity": 0}} />
								<circle ref="handle" className="handle"
									r="6" transform={"translate(0," + this.height + ")"}
									cx={this.props.hasOwnProperty("value")?this.xScale(this.props.value):0}
									>
								</circle>
							</g>
						</g>
					</svg>
				</div>
			</div>
		);
	}
});

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
		var request = new XMLHttpRequest();
		request.open(
			'GET',
			'/json/_count?query='+query,
			true);
		request.onload = function() {
			if(request.status >= 200 && request.status < 400) {
				var data = JSON.parse(request.responseText);
				var count = data[0];
				if(count === 0 && this.state.error.length === 0) {
					this.setState({
						error: "Empty set",
					});
				} else if (count > 0 && this.state.error === "Empty set") {
					this.setState({
						error: "",
					});
				}
			}
		}.bind(this);
		request.send();
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
		var schema = this.props.schema.filters[field];
		var value = "";
		if(schema.type == 'double' || schema.type == 'integer') {
			value = Math.round(schema.stats.mid/schema.stats.step)*schema.stats.step;
			var magnitude = Math.log10(schema.stats.step);
			if(magnitude < 0) {
				value = parseFloat(value.toFixed(Math.abs(magnitude)));
			} else {
				value = parseInt(value.toFixed(0));
			}
		}
		this.props.alterRule({
			field: field,
			operator: schema.operators[0],
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
		if(this.props.schema.filters[this.props.field].type == "string") {
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
			var request = new XMLHttpRequest();
			request.open(
				'GET',
				'/json/'+this.props.schema.scope+'/_suggest?query='+encodeURIComponent(query)+'&fields='+encodeURIComponent(this.props.field),
				true);
			request.onload = function() {
				if(request.status >= 200 && request.status < 400) {
					var data = JSON.parse(request.responseText);
					this.setState({
						suggestions: data[0]
					});
				}
			}.bind(this);
			request.send();
		}
	},
	onSuggestionUpdateRequested: function({value}) {
		this.updateSuggestions(value);
	},
	fieldElement: function() {
		let self = this;
		return (
			<div className="rule-filter-container col-sm-3">
				{this.props.field.split('.').map((elem, idx, path) => {
					let field = path.slice(0,idx).join('.');
					let options=this.props.schema.fieldArray.filter((elem) => {
						let path = elem.value.split('.');
						return path.slice(0,idx).join('.') == field
							&& path.length == idx+1;
					});
					if(idx > 0) {
						options.unshift({label:'-', value:field});
					}
					return (
						<SimpleSelect value={{label:elem,value:field}}
							options={options}
							onValueChange={function({value}={value:""}){self.setField(value);}}
							hideResetButton={true}
						/>
					)
				})}
				{this.props.schema.fieldArray.findIndex((elem) => {return elem.value.startsWith(this.props.field + '.');}) > -1?
					<SimpleSelect value={{label:'-',value:this.props.field}}
						options={this.props.schema.fieldArray.filter((elem) => {
							return elem.value.startsWith(this.props.field + '.')
								&& elem.value.split('.').length == this.props.field.split('.').length + 1;
						}) /*.unshift({label:'-',value:this.props.field})*/ }
						onValueChange={function({value}={value:""}){self.setField(value);}}
						hideResetButton={true}
					/>:null
				}
			</div>
		);
	},
	valueElement: function() {
		if(!this.props.field || !this.props.operator) {
			return;
		}
		var schema=this.props.schema.filters[this.props.field]
		var nb_inputs = this.props.schema.operators[this.props.operator].nb_inputs;
		var fields = []
		for(var i = 0; i < nb_inputs; i++) {
			switch(schema.type) {
			case "string":
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
			case "integer":
			case "double":
				fields.push(
					<GraphSlider
						key={i}
						id={"graphslider" + this.props.id + '.' + i}
						value={this.props.value}
						min={schema.stats.min}
						max={schema.stats.max}
						buckets={schema.buckets}
						step={schema.stats.step}
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
					{this.props.schema.filters[this.props.field].operators.map(function(item, idx) {
						return (
							<option key={idx} value={item}>
								{item.replace(/_/g," ")}
							</option>
						);
					},this)}
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
		ptr.rules[last] = {
			field: this.props.filters[0].field,
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
		var operators = {}
		this.props.operators.forEach(function(item) {
			operators[item.type] = item;
		});
		var filters = {}
		var fieldArray = []
		this.props.filters.forEach(function(filter) {
			if(!filter.label) {
				filter.label = filter.field;
			}
			filter.operators = this.props.operators.filter(function(operator) {
				return operator.apply_to.indexOf(filter.type) >= 0;
			}).map(function(operator) {
				return operator.type;
			});
			if(filter.hasOwnProperty("stats") && filter.stats.hasOwnProperty("min") && filter.stats.hasOwnProperty("max")) {
				filter.stats.mid = (filter.stats.min+filter.stats.max)/2;
				filter.stats.step = Math.pow(10,Math.floor(Math.log10(filter.stats.max-filter.stats.min)))/100;
			}
			filters[filter.field] = filter;
			fieldArray.push({
				value: filter.field,
				label: filter.label,
			});
		},this);
		var schema = {
			scope: this.props.scope,
			operators: operators,
			filters: filters,
			fieldArray: fieldArray,
		};

		return (
			<div className="query-builder">
				<QueryBuilderGroup
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
		var field = '[' + result.field + ']';
		var operator;
		switch(result.operator) {
		case 'exists':
			return (result.complement?"NOT ":"") + ' ' + field;
		case 'match':
			if (result.field === '') {
				return (result.complement?"NOT ":"") + result.value;
			} else {
				return (result.complement?"NOT ":"") + result.value + ' ' + field;
			}
		case 'equal':
			operator = ' = ';
			break;
		case 'not_equal':
			operator = ' ≠ ';
			break;
		case 'less':
			operator = ' < ';
			break;
		case 'less_or_equal':
			operator = ' ≤ ';
			break;
		case 'greater':
			operator = ' > ';
			break;
		case 'greater_or_equal':
			operator = ' ≥ ';
			break;
		}
		return (result.complement?"NOT ":"") + field + operator + result.value
	}
}

var ActionModal = React.createClass({
	getInitialState: function() {
		return {
			format: "json",
			fields: [""],
			pretty: true,
		};
	},
	performAction: function() {
		this.props.onSubmit(this.props.action, this.state.format, this.state.fields, this.state.pretty);
	},
	cancel: function() {
		this.setState(this.getInitialState());
		this.props.onCancel();
	},
	formatChange: function(e) {
		this.setState({
			format: e.target.value,
		});
	},
	fieldChange: function(idx,value) {
		let fields = this.state.fields;
		fields[idx] = value.value;
		this.setState({
			fields: fields,
		});
	},
	prettyChange: function(e) {
		this.setState({
			pretty: e.target.value,
		});
	},
	addField: function() {
		let fields = this.state.fields;
		fields.push(null);
		this.setState({
			fields: fields,
		});
	},
	renderFormat: function() {
		return <FormGroup>
			<Radio inline value="json"
				checked={this.state.format=="json"}
				onChange={this.formatChange}>
				JSON
			</Radio>
			<Radio inline value="tab"
				checked={this.state.format=="tab"}
				onChange={this.formatChange}>
				TAB
			</Radio>
		</FormGroup>;
	},
	renderFields: function() {
		return <div>
			{this.state.fields.map((item, idx) => {
				return <SimpleSelect key={idx}
					value={item?{label:item,value:item}:null}
					options={this.props.fieldArray}
					onValueChange={this.fieldChange.bind(null,idx)}
					hideResetButton={true}
				/>
			})}
			<Button bsSize="xs" bsStyle="default"
				onClick={this.addField}>
				<i className="glyphicon glyphicon-plus"></i>
				&nbsp;Field
			</Button>
		</div>;
	},
	renderPretty: function() {
		return <div>
			<Checkbox checked={this.state.pretty} onChange={this.prettyChange} >
				Pretty
			</Checkbox>
		</div>;
	},
	render: function() {
		return <Modal
					show={this.props.action != null}
					onHide={this.cancel}
				>
				<Modal.Header>
					<Modal.Title>{this.props.action && this.props.action.label}</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{this.props.action && this.props.action.dialog && this.props.action.dialog.format?this.renderFormat():null}
					{this.props.action && this.props.action.dialog && this.props.action.dialog.fields?this.renderFields():null}
					{this.props.action && this.props.action.dialog && this.props.action.dialog.format
						&& this.state.format=="json" && this.props.action.dialog.pretty?this.renderPretty():null}
				</Modal.Body>
				<Modal.Footer>
					<Button bsStyle="primary"
						onClick={this.performAction}>
						{this.props.action?this.props.action.label:null}
					</Button>
					<Button bsStyle="default"
						onClick={this.cancel}>
						Cancel
					</Button>
				</Modal.Footer>
			</Modal>;
	}
});

var QueryBuilder = React.createClass({
	currKey: 0,
	nextKey: function() {
		return this.currKey++;
	},
	getInitialState: function() {
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
		return {
			rules: query.rules?query.rules:{
				condition: "AND",
				rules: [],
			},
			venn: [],
			scope: query.scope?query.scope:"gene/homo/sapiens",
		};
	},
	componentDidMount: function() {
		window.parent.addEventListener("popstate", function(event) {
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
		}.bind(this));
		this.updateVenn();
	},
	submitQuery: function(action, query) {
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
	},
	cancelAction: function() {
		this.setState({
			currAction: null,
		});
	},
	performAction: function(action, format, fields, pretty) {
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
	},
	scopeQuery: function(query) {
		return '@' + this.state.scope + '  ' + query;
	},
	parseQueryGroups: function(result) {
		return result.rules.map(parseQueryObject)
			.map(function(element, index) {
				return {query: element, id: index}
			})
	},
	updateVenn: function() {
		var regions = combinations(this.parseQueryGroups(this.state.rules));
		if (!regions) {
			regions = [[{id:0,query:""}]]
		}
		var queries = [];
		var vennSet = [];
		for (var index = 0; index < regions.length; index++) {
			var sets = regions[index].map(function(e) { return e.id; })
			var query = regions[index].map(function(e) { return e.query; }).join(' AND ')
			var label = ""
			queries.push(encodeURIComponent(this.scopeQuery(query)));
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
		var request = new XMLHttpRequest();
		request.open(
			'GET',
			'/json/_count?query='+queries.join("&query="),
			true);
		request.onload = function() {
			if(request.status >= 200 && request.status < 400) {
				var data = JSON.parse(request.responseText);
				for(var index = 0; index < vennSet.length; index++) {
					vennSet[index].size = data[index];
				}
				var zeroes = vennSet.filter(function(e){return e.sets.length === 1 && e.size === 0;})
					.map(function(e){return e.sets[0]});
				this.setState({
					venn: vennSet.filter(function(e){
						return intersect(e.sets,zeroes).length === 0;
					})
				});
			}
		}.bind(this);
		request.send();
	},
	setScope: function(scope) {
		if(scope === null) {
			scope = "gene/homo/sapiens";
		}
		this.setState({
			scope: scope,
		});
		this.updateVenn();
	},
	setRules: function(rules) {
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
	},
	render: function() {
		var self = this;
		var fieldArray = []
		this.props.filters.forEach(function(filter) {
			if(!filter.label) {
				filter.label = filter.field.split('.').slice(-1)[0]; // Split label by dots, then use last elem
			}
			fieldArray.push({
				value: filter.field,
				label: filter.label,
			});
		},this);
		return (
			<div className="query-builder-container">
				<SimpleSelect value={{label:this.state.scope,value:this.state.scope}}
					options={this.props.scopes}
					onValueChange={function({value}){self.setScope(value);}}
					hideResetButton={true}
				/>
				<VennDiagram ref="venn" sets={this.state.venn}
					tooltip={function(d,i) {
						return (d.query.length?d.query:d.label) + "<br>" + d.size + " hits";
					}}
					onClick={function(d,i) {
						this.submitQuery(this.props.actions[0], d.query);
					}.bind(this)}
				/>
				<QueryBuilderCore ref="builder"
					scope={this.state.scope}
					operators={this.props.operators}
					filters={this.props.filters}
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
				<ActionModal
					action={this.state.currAction}
					onCancel={this.cancelAction}
					onSubmit={this.performAction}
					fieldArray={fieldArray}
				/>
			</div>
		);
	}
})

export function init(element, options) {
	var contentLoaded, messagePosted = false;

	function render() {
		ReactDOM.render(React.createElement(QueryBuilder, options), element);
	}

	function messageHandler(event) {
		if(event.origin !== window.location.origin) return;

		Object.assign(options, event.data);
		window.removeEventListener("message", messageHandler);
		messagePosted = true;
		if(contentLoaded && messagePosted) {
			render();
		}
	};

	document.addEventListener("DOMContentLoaded", function(event) {
		contentLoaded = true;
		if(contentLoaded && messagePosted) {
			render();
		}
	});

	window.addEventListener("message", messageHandler);
}
