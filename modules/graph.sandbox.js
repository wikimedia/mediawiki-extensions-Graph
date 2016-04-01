( function ( $, mw ) {
	var oldContent, ccw, $rightSplitTop,
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
		$( '#mw-graph-right' ).split( {
			orientation: 'horizontal',
			limit: 100,
			position: initialPosition,
			onDrag: function () {
				resizeCodeEditor( $rightSplitTop.height() );
			}
		} );
	} );

	mw.hook( 'codeEditor.configure' ).add( function ( session ) {
		var $errorLog = $( '#mw-graph-log' )[ 0 ],
			$json = $( '#mw-graph-json' )[ 0 ],
			$graph = $( '.mw-graph' )[ 0 ],
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

		resizeCodeEditor = function ( height ) {
			$editor.parent().height( height - 57 );
			$.wikiEditor.instances[ 0 ].data( 'wikiEditor-context' ).codeEditor.resize();
		};

		$rightSplitTop = $( '#mw-graph-right .top_panel' );
		resizeCodeEditor( $rightSplitTop.height() );

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
				$errorLog.textContent = '...';
				mw.drawVegaGraph( $graph, data.graph, function ( error ) {
					if ( error ) {
						$errorLog.textContent = ( error.exception || error ).toString();
					} else {
						$errorLog.textContent = mw.msg( 'ok' );
					}
				} );
			} ).fail( function ( errCode, error ) {
				$errorLog.textContent = errCode.toString() + ':' + ( error.exception || error ).toString();
			} );
		} ) );
	} );

}( jQuery, mediaWiki ) );
