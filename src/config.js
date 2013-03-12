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
		element: document.getElementsByClassName('content-holder')[0]
	});

	// Google calendar
	config.pages.push({
		url: '^https://www.google.com/calendar/',
		element: document.getElementById('scrolltimedeventswk')
	});

	// Google Drive
	config.pages.push({
		url: '^https://drive.google.com',
		element: document.getElementsByClassName('doclistview-list')[0]
	});

	// Google Document
	config.pages.push({
		url: '^https://docs.google.com/document/d/([a-zA-Z0-9-_])*/view',
		element: document.getElementsByClassName('kix-appview-editor')[0]
	});

	window.scrollbench_config = config;
})();
