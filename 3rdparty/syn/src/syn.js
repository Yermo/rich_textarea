steal('src/synthetic.js',
	'src/mouse.js',
	'src/browsers.js',
	'src/key.js',
	'src/drag/drag.js', function(Syn) {
	window.Syn = Syn;

	return Syn;
});