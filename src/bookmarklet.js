// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
(function() {
	if ( !window.ScrollBench && !window.scrollbench_bookmarklet ) {
		window.scrollbench_bookmarklet = true;
		var script = document.createElement('script');
		//script.src = 'https://raw.github.com/cubiq/scrollbench.js/master/src/scrollbench.js';
		script.src = 'https://sb.cubiq.org/src/scrollbench.js?v' + Date.now();
		script.addEventListener('load', run, false);
		document.getElementsByTagName('head')[0].appendChild(script);
		return;
	}

	run();

	function run () {
		window.ScrollBench && new ScrollBench({ loadConfig: true }).start();
	}
})();