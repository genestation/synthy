import jStat from 'jStat';
import elasticsearch from 'elasticsearch';
import {elastic_count} from './Genestation.js';

export function stats(es, index, field, query) {
	let client = new elasticsearch.Client({host: es});
	let body = [{},{
		size: 0,
		query: {query_string: {query: query}},
		aggs: {stats: {extended_stats: {field: field}}},
	}];
	return client.msearch({
		index: index,
		body: body,
	}).then((responses)=>{
		return responses.responses[0].aggregations.stats;
	})
}

export function chisquare(es, index, i1, i2) {
	// Create queries
	let q1 = '(' + i1 + ')';
	let q2 = '(' + i2 + ')';
	let not_q1 = 'NOT (' + i1 + ')';
	let not_q2 = 'NOT (' + i2 + ')';
	let q1_and_q2 = q1 + ' AND ' + q2;
	let q1_and_not_q2 = q1 + ' AND ' + not_q2;
	let not_q1_and_q2 = not_q1 + ' AND ' + q2;
	let not_q1_and_not_q2 = not_q1 + ' AND ' + not_q2;
	// Fetch counts
	return elastic_count(es, index, [
		q1, q2,
		not_q1, not_q2,
		q1_and_q2, q1_and_not_q2,
		not_q1_and_q2, not_q1_and_not_q2,
	]).then((counts)=>{
		// Retrieve counts
		let [
			count_q1, count_q2,
			count_not_q1, count_not_q2,
			obs_q1_and_q2, obs_q1_and_not_q2,
			obs_not_q1_and_q2, obs_not_q1_and_not_q2,
		] = counts;
		// calculate total
		let total = count_q1 + count_not_q1;
		let total_q2 = count_q2 + count_not_q2;
		if(total !== total_q2) console.log('TOTALS DO NOT ADD UP!!!'); // This shouldn't happen >.>
		// calculate frequencies
		let freq_q1 = count_q1 / total;
		let freq_not_q1 = count_not_q1 / total;
		let freq_q2 = count_q2 / total;
		let freq_not_q2 = count_not_q2 / total;
		// calculate expected counts
		let exp_q1_and_q2 = freq_q1 * freq_q2 * total;
		let exp_q1_and_not_q2 = freq_q1 * freq_not_q2 * total;
		let exp_not_q1_and_q2 = freq_not_q1 * freq_q2 * total;
		let exp_not_q1_and_not_q2 = freq_not_q1 * freq_not_q2 * total;
		// calculate chi square
		let chisqr =
			Math.pow(obs_q1_and_q2 - exp_q1_and_q2, 2) / exp_q1_and_q2 +
			Math.pow(obs_q1_and_not_q2 - exp_q1_and_not_q2, 2) / exp_q1_and_not_q2 +
			Math.pow(obs_not_q1_and_q2 - exp_not_q1_and_q2, 2) / exp_not_q1_and_q2 +
			Math.pow(obs_not_q1_and_not_q2 - exp_not_q1_and_not_q2, 2) / exp_not_q1_and_not_q2;
		let pval = 1-jStat.chisquare.cdf(chisqr,1);
		return {
			chisqr: chisqr,
			pval: pval,
		}
	});
}

export function ttest(es, index, field, q0, q1) {
	let client = new elasticsearch.Client({host: es});
	let body = [{},{
		size: 0,
		query: {query_string: {query: q0}},
		aggs: {stats: {extended_stats: {field: field}}},
	},{},{
		size: 0,
		query: {query_string: {query: q1}},
		aggs: {stats: {extended_stats: {field: field}}},
	}];
	return client.msearch({
		index: index,
		body: body,
	}).then((responses)=>{
		let stats0 = responses.responses[0].aggregations.stats;
		let stats1 = responses.responses[1].aggregations.stats;
		// Welch's t-test
		let tstat = (stats0.avg - stats1.avg) / Math.sqrt(stats0.variance/stats0.count + stats1.variance/stats1.count)
		let df = welsch_satterthwaite([stats0, stats1]);
		let pval = 2*(1-jStat.studentt.cdf(Math.abs(tstat),df));
		return {
			tstat: tstat,
			df: df,
			pval: pval,
			stats: [stats0, stats1],
		}
	})
}

export function welsch_satterthwaite(stats) {
	return Math.pow(stats.reduce((accum, stat)=>accum + stat.variance/stat.count,0),2) /
		stats.reduce((accum, stat)=>accum + Math.pow(stat.variance,2)/(Math.pow(stat.count,2)*(stat.count-1)),0);
}
