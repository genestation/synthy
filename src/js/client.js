"use strict";

import {iframeResizer} from 'iframe-resizer';


export function init(element, options) {
	function onLoad(iframe) {
		// Post Synthy's message
		iframe.contentWindow.postMessage(options,window.location.origin);

		// Post iframeResizer message after our message
		iframeResizer(iframe);
	}

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
