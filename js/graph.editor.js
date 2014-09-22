( function( $ ) {
	var oldContent = '';
	(function() {
		$('.mw-wiki-graph').each(function () {
			// This should not be a loop - there must be only one value with this class
			var el = this,
				textbox = $('#wpTextbox1'),
				context = textbox && textbox.data('wikiEditor-context');

			if (!context || !context.fn || !context.fn.getContents) {
				return;
			}
			var content = context.fn.getContents();
			if (oldContent === content) {
				return;
			}
			oldContent = content;
			var spec = null;
			try {
				spec = $.parseJSON(content);
			} catch(err) {
			}
			if (spec === null) {
				return;
			}
			if (this.hasAttribute('spec'))
				this.removeAttribute('spec');
			vg.parse.spec(spec, function(chart) { chart({el:el}).update(); });
		});
		// FIXME: This should be done on data modification, not on timer
		setTimeout(arguments.callee, 300);
	})();
} ( jQuery ) );
