// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
(function() {
	if ( !window.scrollbench_bookmarklet && !window.ScrollBench ) {
		window.scrollbench_bookmarklet = true;
		var script = document.createElement('script');
		script.src = 'https://raw.github.com/cubiq/scrollbench.js/master/src/scrollbench.js';
		script.addEventListener('load', run);
		document.getElementsByTagName('head')[0].appendChild(script);
	} else {
		run();
	}

	function run () {
		new ScrollBench().start();
	}
})();