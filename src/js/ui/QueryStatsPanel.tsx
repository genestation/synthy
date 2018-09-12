import React from 'react';
import ReactDOM from 'react-dom';
import {chisquare} from '../Statistics.js';
import {Dropdown, DropdownList} from '../Dropdown.tsx';

interface QueryStatsPanelProps {
	elastic: string,
	index: string,
	groups: string[],
}
interface QueryStatsPanelState {
	analysis?: string,
	analysis_output?: React.Component,
}
interface AnalysisMeta {
	name: string,
	min_group: number,
	max_group: number,
	func: ()=>any,
}
export class QueryStatsPanel extends React.Component<QueryStatsPanelProps,QueryStatsPanelState> {
	constructor(props) {
		super(props);
		this.analyses = [
			{name: 'chisqr', min_group: 2, max_group: 2, func: this.chisquare}
		];
		this.state = {
			analysis: null,
		};
	}
	componentDidUpdate(prevProps, prevState) {
		if(arrayEquals(prevProps.groups, this.props.groups)
			&& prevProps.index === this.props.index
			&& prevState.analysis === this.state.analysis) {
			return
		} else if (this.state.analysis === null) {
			let valid = this.validAnalyses();
			if(valid.length) {
				this.setState({analysis: valid[0].name});
			}
		} else {
			this.analyses.find((analysis)=>analysis.name == this.state.analysis)
				.func();
		}
	}
	validAnalyses() {
		return this.analyses.filter((analysis)=>{
			return analysis.min_group <= this.props.groups.length
				&& analysis.max_group >= this.props.groups.length;
		});
	}
	chisquare = ()=>{
		console.log(this.props.groups);
		chisquare(this.props.elastic, this.props.index, this.props.groups[0], this.props.groups[1])
		.then((output)=>{
			console.log(output)
		});
	}
	render() {
		let options= this.validAnalyses().map((analysis)=>{
			return {label: analysis.name, value: analysis.name}
		});
		return <div>
			<Dropdown className="" label="Analysis"
				value={this.state.analysis}>
				<DropdownList options={options}
					onChange={(option)=>{this.setState({analysis: option.value})}}
				/>
			</Dropdown>
		</div>;
	}
}

function arrayEquals(arr1: any[], arr2: any[]): bool {
	if (arr1.length === arr2.length) {
		return arr1.every((elem: any, idx: number)=> elem === arr2[idx]);
	} else {
		return false;
	}
}
