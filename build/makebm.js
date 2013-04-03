var fs = require('fs');
var uglifyjs = require("uglify-js");

var bookmarklet = uglifyjs.minify('../src/bookmarklet.js').code;

updateTemplate('../demo/bookmarklet.html');
updateTemplate('../index.html');

function updateTemplate (template) {

	fs.readFile(template, 'utf8', function ( err, data ) {
		if ( err ) {
			return 'Error: can\'t read file';
		}

		data = data.replace(/(<!-- bookmarklet --><a href="javascript:)(.*?)("><!-- \/bookmarklet -->)/, '$1' + bookmarklet.replace(/"/g, "'") + '$3');
		data = data.replace(/(<!-- bookmarklet --><textarea>javascript:)(.*?)(<\/textarea><!-- \/bookmarklet -->)/, '$1' + bookmarklet + '$3');

		fs.writeFile(template, data, function ( err ) {
			if ( err ) {
				return 'Error: can\'t write file';
			}
		});
	});

}
