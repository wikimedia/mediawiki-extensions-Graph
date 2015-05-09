( function ( $, mw ) {
	var oldContent = '';
	mw.hook( 'codeEditor.configure' ).add( function ( session ) {
		function refreshGraph() {
			try {
				var spec,
					el = $( '.mw-wiki-graph' ).get( 0 ),
					content = session.getValue();

				if ( oldContent === content ) {
					return;
				}
				oldContent = content;

				spec = $.parseJSON( content );
				if ( spec === null ) {
					return;
				}

				vg.parse.spec( spec, function ( chart ) {
					chart( { el: el } ).update();
				} );
			} finally {
				// FIXME: This should be done on data modification, not on timer
				setTimeout( refreshGraph, 300 );
			}
		}
		refreshGraph();
	} );
}( jQuery, mediaWiki ) );
