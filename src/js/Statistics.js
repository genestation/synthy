import jStat from 'jStat';
import {elastic_count} from './Genestation.js';

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
