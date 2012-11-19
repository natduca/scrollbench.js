// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
(function() {
	if ( !window.scrollbench_bookmarklet ) {
		window.scrollbench_bookmarklet = true;
		var script = document.createElement('script');
		script.src = 'http://lab.cubiq.org/scrollbench.js/src/scrollbench.js';
		script.addEventListener('load', run, false);
		document.getElementsByTagName('head')[0].appendChild(script);
	} else {
		run();
	}

	function run () {
		window.ScrollBench && new ScrollBench().start();
	}
})();