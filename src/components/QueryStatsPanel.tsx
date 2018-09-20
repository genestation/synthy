import React from 'react';
import ReactDOM from 'react-dom';
import {chisquare} from '../helpers/Statistics.js';
import {Dropdown, DropdownList} from './Dropdown.tsx';
import {TreeSelect} from './TreeSelect.tsx';

interface QueryStatsPanelProps {
	elastic: string,
	fields: string[],
	index: string,
	groups: string[],
}
interface QueryStatsPanelState {
	analysis?: string,
	analysis_field?: string,
	analysis_output?: React.Component,
}
interface AnalysisMeta {
	name: string,
	min_group: number,
	max_group: number,
	has_field: boolean,
	output: ()=>any,
}
export class QueryStatsPanel extends React.Component<QueryStatsPanelProps,QueryStatsPanelState> {
	constructor(props) {
		super(props);
		this.analyses = [
			{name: 'Chi-Square', min_group: 2, max_group: 2, has_field: false, output: this.chisquare},
			{name: 'T-test', min_group: 2, max_group: 2, has_field: true, output: this.ttest},
		];
		this.state = {
			analysis: null,
		};
	}
	componentDidUpdate(prevProps, prevState) {
		if(arrayEquals(prevProps.groups, this.props.groups)
			&& prevProps.index === this.props.index
			&& prevState.analysis === this.state.analysis
			&& prevState.analysis_field === this.state.analysis_field) {
			return
		} else if (this.state.analysis === null) {
			let valid = this.validAnalyses();
			if(valid.length) {
				this.setState({
					analysis: valid[0].name,
					analysis_field: this.props.fields[0]
				});
			}
		} else {
			this.analyses.find((analysis)=>analysis.name == this.state.analysis)
				.output(this.state.analysis_field);
		}
	}
	validAnalyses() {
		return this.analyses.filter((analysis)=>{
			return analysis.min_group <= this.props.groups.length
				&& analysis.max_group >= this.props.groups.length;
		});
	}
	chisquare = ()=>{
		chisquare(this.props.elastic, this.props.index, this.props.groups[0], this.props.groups[1])
		.then((output)=>{
			let chisqr = output.chisqr > 999 || output.chisqr < 0.1 ?
				output.chisqr.toExponential(2) : Math.round(output.chisqr*100)/100;
			let pval = output.pval < 0.01?output.pval.toExponential(2):Math.round(output.pval*100)/100;
			let table = <table><tbody>
				<tr><th>Chi-Sqr</th><td>{chisqr}</td></tr>
				<tr><th>p-val</th><td>{pval}</td></tr>
			</tbody></table>
			this.setState({
				analysis_output: table,
			})

		});
	}
	ttest = (field: string)=>{
	}
	render() {
		let options= this.validAnalyses().map((analysis)=>{
			return {label: analysis.name, value: analysis.name}
		});
		let analysis = this.analyses.find((analysis)=>analysis.name == this.state.analysis);
		return <div>
			<div>
				<Dropdown className="" label="Analysis"
					value={this.state.analysis}>
					<DropdownList options={options}
						onChange={(option)=>{this.setState({analysis: option.value, analysis_field: this.props.fields[0]})}}
					/>
				</Dropdown>
			</div>
			{analysis && analysis.has_field?
				<div>
					<Dropdown className="" autoclose={false} label="Field"
						value={this.state.analysis_field}>
						<TreeSelect fields={this.props.fields}
							value={this.state.analysis_field}
							onSelect={(node)=>{this.setState({analysis_field: node.path})}} />
					</Dropdown>
				</div>
			:null}
			<div className="query-stat-output">
				{this.state.analysis_output}
			</div>
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
