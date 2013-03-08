(function () {
	var config = {
		pages: []
	};

	// Gmail
	config.pages.push({
		url: '^https://mail.google.com/mail/',
		scrollableElementFn: function (callback) {
			gmonkey.load('2.0',
				function (api) {
					callback( api.getScrollableElement() );
				}
			);
		}
	});
	
	// Acko
	config.pages.push({
		url: '^http://acko.net',
		element: document.querySelector('.content-holder')
	});

	window.scrollbench_config = config;
})();
