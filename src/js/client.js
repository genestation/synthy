"use strict";

import {iframeResizer} from 'iframe-resizer';


export function init(element, options) {
	let actions = {};
	function onLoad(iframe) {
		let message = options;
		message.actions = message.actions.map((item) => {
			if(typeof item.action == 'function') {
				actions[item.label] = item.action;
				item.action=true;
			}
			return item;
		});
		// Post Synthy's message
		iframe.contentWindow.postMessage(message, window.location.origin);

		// Post iframeResizer message after our message
		iframeResizer(iframe);
	}

	window.addEventListener("message", function(event) {
		if(event.origin !== window.location.origin) return;

		if(actions.hasOwnProperty(event.data.label)) {
			actions[event.data.label](event.data.url, event.data.query);
		};
	});

	document.addEventListener("DOMContentLoaded", function(event) {
		var iframe = document.createElement('iframe');
		iframe.frameBorder=0;
		iframe.width="100%";
		iframe.scrolling="no";
		iframe.onload=function() {onLoad(this);};
		iframe.innerHTML="Browser does not support iframes";
		iframe.src="/_synthy";
		element.appendChild(iframe);
	});
}
