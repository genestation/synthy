import React from 'react';
import ReactDOM from 'react-dom';
import d3 from 'd3';

export var GraphSlider = React.createClass({
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
	step: function() {
		return Math.pow(10,Math.floor(Math.log10(this.props.max-this.props.min)))/this.props.steps;
	},
	discretize: function(value) {
		if(value < this.props.max && value > this.props.min) {
			value = Math.round(value/this.step())*this.step();
			var magnitude = Math.log10(this.step());
			if(magnitude < 0) {
				return parseFloat(value.toFixed(Math.min(20,Math.abs(magnitude))));
			} else {
				return parseInt(value.toFixed(0));
			}
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
				return bucket.doc_count;
			})])
			.range([0,this.height]);

		var that = this;
		this.area = d3.svg.area()
			.x(function(d) { return that.xScale(d.from); })
			.y(function(d) { return that.height-that.yScale(d.doc_count)-5; })
			.y0(function(d) { return that.height; });
		this.line = d3.svg.line()
			.x(function(d) { return that.xScale(d.from); })
			.y(function(d) { return that.height-that.yScale(d.doc_count)-5; });

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
				return bucket.doc_count;
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
						min={Math.floor(this.props.min/this.step())*this.step()}
						max={Math.floor(this.props.max/this.step())*this.step()}
						step={this.step()}
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

