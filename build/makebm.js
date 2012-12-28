var fs = require('fs');
var uglifyjs = require("uglify-js");

var template = '../demo/bookmarklet.html';
var bookmarklet = uglifyjs.minify('../src/bookmarklet.js').code.replace(/"/g, "'");

fs.readFile(template, 'utf8', function ( err, data ) {
	if ( err ) {
		return 'Error: can\'t read file';
	}

	data = data.replace(/(<!-- bookmarklet_start --><a href="javascript:)(.*?)("><!-- bookmarklet_end -->)/, '$1' + bookmarklet + '$3');
	data = data.replace(/(<!-- bookmarklet_start --><textarea>javascript:)(.*?)(<\/textarea><!-- bookmarklet_end -->)/, '$1' + bookmarklet + '$3');

	fs.writeFile(template, data, function ( err ) {
		if ( err ) {
			return 'Error: can\'t write file';
		}
	});
});