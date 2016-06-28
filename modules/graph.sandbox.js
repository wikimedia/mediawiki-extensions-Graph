( function ( $, mw ) {
	var oldContent, ccw,
		resizeCodeEditor = $.noop;

	$( function () {
		var viewportHeight = $( window ).height(),
			sandboxHeight = viewportHeight - 150,
			initialPosition = sandboxHeight - 100;
		$( '#mw-graph-sandbox' ).width( '100%' ).height( sandboxHeight ).split( {
			orientation: 'vertical',
			limit: 100,
			position: '40%'
		} );
		$( '#mw-graph-left' ).split( {
			orientation: 'horizontal',
			limit: 100,
			position: initialPosition
		} );
	} );

	mw.hook( 'codeEditor.configure' ).add( function ( session ) {
		var $json = $( '#mw-graph-json' )[ 0 ],
			$graph = $( '.mw-graph' )[ 0 ],
			$rightPanel = $( '#mw-graph-right' ),
			$editor = $( '.editor' );

		if ( ccw ) {
			ccw.release();
		}
		ccw = mw.confirmCloseWindow( {
			test: function () {
				return session.getValue().length > 0;
			},
			message: mw.msg( 'editwarning-warning' )
		} );

		resizeCodeEditor = function () {
			$editor.parent().height( $rightPanel.height() - 57 );
			$.wikiEditor.instances[ 0 ].data( 'wikiEditor-context' ).codeEditor.resize();
		};

		// I tried to resize on $( window ).resize(), but that didn't work right
		resizeCodeEditor();

		session.on( 'change', $.debounce( 300, function () {
			var content = session.getValue();

			if ( oldContent === content ) {
				return;
			}
			oldContent = content;

			new mw.Api().post( {
				formatversion: 2,
				action: 'graph',
				text: content
			} ).done( function ( data ) {
				if ( session.getValue() !== content ) {
					// Just in case the content has changed since we made the api call
					return;
				}
				$json.textContent = JSON.stringify( data.graph, null, 2 );
				$graph.textContent = '...';
				mw.drawVegaGraph( $graph, data.graph, function ( error ) {
					if ( error ) {
						$graph.textContent = ( error.exception || error ).toString();
					}
				} );
			} ).fail( function ( errCode, error ) {
				$graph.textContent = errCode.toString() + ':' + ( error.exception || error ).toString();
			} );
		} ) );
	} );

}( jQuery, mediaWiki ) );
