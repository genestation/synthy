"use strict"

import './Dropdown.scss';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

export interface DropdownProps{
	className?: string;
	autoclose?: boolean;
	label?: string;
	value?: string;
	tabindex?: number;
}
export interface DropdownState{
	visible: boolean;
}
export class Dropdown extends React.Component<DropdownProps,DropdownState> {
	child: {
		container?: HTMLElement;
	} = {};
	static defaultProps: DropdownProps = {
		autoclose: true,
	}
	constructor(props: DropdownProps) {
		super(props);
	}
	blur() {
		this.child.container.blur();
	}
	render() {
		return <div className={"dropdown-container " + (this.props.className?this.props.className:"")}
			tabIndex={this.props.tabindex?this.props.tabindex:0}
			ref={(ref)=>this.child.container = ref}
			>
			<div className="dropdown-close"
				onClick={()=>{this.child.container.blur()}}
			/>
			<div className="dropdown-label">
				{this.props.label}:
			</div>
			<div className="dropdown-button-container">
				<div className="dropdown-button">
					{this.props.value}
				</div>
				<div className="dropdown-items"
					onClick={()=>{this.props.autoclose?this.child.container.blur():null}}
					onMouseLeave={()=>{this.child.container.blur()}}
				>
					{this.props.children}
				</div>
			</div>
		</div>
	}
}

export interface DropdownListOption {
	label: string,
	value: any,
}
export interface DropdownListProps {
	options: DropdownListOption[],
	onChange: (option: DropdownListOption)=>any,
}
export function DropdownList(props: DropdownListProps) {
	return <ul className="dropdown-list">
		{props.options.map((option: DropdownListOption, idx: number)=>{
			return <li key={idx} className="dropdown-item"
			onClick={()=>props.onChange(option)}>
				{option.label}
				</li>
		})}
	</ul>
}

export function DropdownListFind(value: any, options: DropdownListOption[]) {
	return options.find((option: DropdownListOption)=>option.value == value);
}
