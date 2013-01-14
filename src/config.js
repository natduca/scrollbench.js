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

	window.scrollbench_config = config;
})();