"use strict"

import './TreeSelect.scss';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCaretDown, faCaretRight } from '@fortawesome/free-solid-svg-icons'

interface TreeSelectProps {
	fields: string[],
	value: string,
	onSelect: (node: TreeNode)=>any,
}
interface TreeSelectState {}
export class TreeSelect extends React.Component<TreeSelectProps,TreeSelectState> {
	constructor(props: TreeSelectProps) {
		super(props);
		this.state = {};
	}
	selectNode = (node: TreeNode)=>{
		this.props.onSelect(node);
	}
	render() {
		let fields = [] as TreeNode[];
		this.props.fields.forEach((field: string)=>{
			let ptr = fields;
			field.split('.').forEach((part: string, idx: number, array: string[])=>{
				let childIdx = ptr.findIndex((child: TreeNode)=>child.name == part);
				if(childIdx == -1) {
					let path = array.slice(0,idx+1).join('.');
					childIdx = ptr.push({
						name: part,
						path: array.slice(0,idx+1).join('.'),
						toggled: this.props.value && this.props.value.startsWith(path),
						active: this.props.value && this.props.value == path,
						valid: idx == array.length - 1,
					}) - 1;
				}
				if(idx != array.length - 1) {
					if(!ptr[childIdx].children) {
						ptr[childIdx].children = [];
					}
					ptr = ptr[childIdx].children;
				}
			})
		});
		return <Tree
			data={fields}
			onToggle={this.selectNode}
		/>
	}
}

export interface TreeNode {
	name: string,
	path: string,
	valid: boolean,
	children?: TreeNode[],
	toggled?: boolean,
	active?: boolean,
}
export interface TreeProps {
	onToggle: (TreeNode)=>any,
	data: TreeNode[],
}
export class Tree extends React.Component<TreeProps,{}> {
	constructor(props: TreeNodeProps) {
		super(props);
		this.state = {};
	}
	render() {
		return <ul className="react-treenodelist"> {
			this.props.data.sort((a: TreeNode,b: TreeNode)=>{
				let a_children = a.children && a.children.length > 0;
				let b_children = b.children && b.children.length > 0;
				if(a_children && !b_children) {
					return -1;
				} else if(!a_children && b_children) {
					return 1;
				} else if(a.name < b.name) {
					return -1;
				} else if(a.name > b.name) {
					return 1;
				} else {
					return 0;
				}
			}).map((node: TreeNode, idx: number)=>{
				let children = node.children && node.children.length > 0;
				return <li key={idx} className="react-treenode">
					<div className={"react-treenode-label" + (node.active?" react-treenode-label-active":"")}
						 onClick={(e)=>{e.stopPropagation(); this.props.onToggle(node)}}>
						{children?
							<span className="react-treenode-caret"> {
								node.toggled?<FontAwesomeIcon icon={faCaretDown}/>:<FontAwesomeIcon icon={faCaretRight}/>
							} </span>
						:null}
						{node.name}
					</div>
					{children && node.toggled?<Tree onToggle={this.props.onToggle} data={node.children} />:null}
				</li>
			})
		} </ul>
	}
}
