( function ( $, mw ) {
	var oldContent, ccw;

	$( function () {
		$( '#mw-graph-sandbox' ).width( '100%' ).height( 700 ).split( { orientation: 'vertical', limit: 100, position: '40%' } );
		$( '#mw-graph-left' ).split( { orientation: 'horizontal', limit: 100, position: '90%' } );
		$( '#mw-graph-right' ).split( { orientation: 'horizontal', limit: 100, position: '90%' } );
	} );

	mw.hook( 'codeEditor.configure' ).add( function ( session ) {
		var $errorLog = $( '#mw-graph-log' )[ 0 ],
			$json = $( '#mw-graph-json' )[ 0 ],
			$graph = $( '.mw-graph' )[ 0 ];

		if ( ccw ) {
			ccw.release();
		}
		ccw = mw.confirmCloseWindow( {
			test: function () {
				return session.getValue().length > 0;
			},
			message: mw.msg( 'editwarning-warning' )
		} );

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
