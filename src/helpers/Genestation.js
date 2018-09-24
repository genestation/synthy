'use strict';

import elasticsearch from 'elasticsearch';

export function get_schema(es, genome_index) {
	let client = new elasticsearch.Client({host: es});
	return get_all_records(client,genome_index)
	.then((response)=>{
		return Promise.all(response.map((genome)=>{
			// get feature indexes
			return client.indices.getAlias({index:'feature.'+genome_identifier(genome)+'.*'})
			.then((response)=>{
				// get field descriptors
				let indices = Object.keys(response);
				return Promise.all(indices.map((index)=>get_all_records(client,'meta.'+index)))
				.then((responses)=>{
					let schema = {};
					indices.forEach((index, idx)=>{
						schema[index] = {};
						responses[idx].forEach((meta_obj)=>{
							schema[index][meta_obj.field] = meta_obj;
						})
					})
					return schema;
				})
			})
		}))
	}).then((responses)=>{
		return responses.reduce((accum,item)=>Object.assign(accum,item),{});
	})
}

function genome_identifier(genome) {
	let organism = [genome.genus,genome.species];
	if(genome.hasOwnProperty('subspecies') && typeof genome.subspecies === 'string' && genome.subspecies.length > 0) {
		organism.push(genome.subspecies)
	}
	let identifier = organism.join('_').toLowerCase().replace(/[. ]/,"_")
		+ '.' + genome.version.toLowerCase().replace(/[. ]/,"_");
	return identifier;
}

export function elastic_count(es, index, queries) {
	let client = new elasticsearch.Client({host: es});
	let body = [];
	queries.forEach((query)=>{
		body.push({});
		if (query) {
			body.push({
				size: 0,
				query: {query_string: {query: query}},
			});
		} else {
			body.push({
				size: 0,
				query: {match_all: {}},
			});
		}
	});
	return client.msearch({
		index: index,
		body: body,
	}).then((responses)=>{
		return responses.responses.map((response)=>response.hits?response.hits.total:0);
	});
}

export function get_suggestions(es, index, field, text) {
	let client = new elasticsearch.Client({host: es});
	client.search({
		index: index,
		suggestField: field,
		suggestText: text,
	}).then((response)=>{
		console.log(response)
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
