"use strict";

import {iframeResizer} from 'iframe-resizer';

export function init(element, options) {
	document.addEventListener("DOMContentLoaded", function(event) {
		var iframe = document.createElement('iframe');
		iframe.frameBorder=0;
		iframe.width="100%";
		iframe.scrolling="no";
		iframe.onload=function() {iframeResizer(this);};
		iframe.innerHTML="Browser does not support iframes";
		iframe.src="/_synthy?actions=queryActions&queryVar=query";
		element.appendChild(iframe);
	});
}
