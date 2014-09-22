( function( $ ) {
	var oldContent = '';
	(function() {
		$('.mw-wiki-graph').each(function () {
			// This should not be a loop - there must be only one value with this class
			var el = this,
				textbox = $('#wpTextbox1'),
				context = textbox && textbox.data('wikiEditor-context');

			if (!context || !context.evt || !context.evt.codeEditorSync || !context.fn) {
				return;
			}
			context.evt.codeEditorSync();
			var content = context.fn.getContents();
			if (oldContent === content) {
				return;
			}
			oldContent = content;
			var annotations = context.codeEditor.getSession().getAnnotations();
			if (annotations.every(function(v) { return v.type !== 'error'; })) {
				if (this.hasAttribute('spec'))
					this.removeAttribute('spec');
				var spec = $.parseJSON(content);
				vg.parse.spec(spec, function(chart) { chart({el:el}).update(); });
			}
		});
		// FIXME: This should be done on data modification, not on timer
		setTimeout(arguments.callee, 300);
	})();
} ( jQuery ) );
