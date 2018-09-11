'use strict';

import elasticsearch from 'elasticsearch';

export function get_schema(es, indices) {
	let client = new elasticsearch.Client({host: es});
	return Promise.all(indices.map((index)=>get_all_records(client,'stats.'+index)))
		.then((responses)=>{
			let schema = {};
			indices.forEach((index, idx)=>{
				schema[index] = {};
				responses[idx].forEach((stat_obj)=>{
					schema[index][stat_obj.field] = stat_obj;
				})
			})
			console.log(schema);
			return schema;
		})
}

async function get_all_records(client, index) {
	let allRecords = [];
	let {_scroll_id, hits} = await client.search({
		index: index,
		scroll: '10s',
	});
	while(hits && hits.hits.length) {
		allRecords.push(...hits.hits.map((hit)=>hit._source));
		({_scroll_id, hits} = await client.scroll({
			scroll_id: _scroll_id,
			scroll: '10s',
		}));
	}
	return allRecords;
}
