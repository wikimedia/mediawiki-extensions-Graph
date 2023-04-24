/* eslint-disable no-jquery/no-global-selector */
( function () {
	let oldContent, ccw, resizeCodeEditor;
	const loadGraph = require( 'ext.graph.lite' );

	$( function () {
		const viewportHeight = $( window ).height(),
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
		const $json = $( '#mw-graph-json' )[ 0 ],
			$graph = $( '.mw-graph' ),
			$graphEl = $graph[ 0 ],
			$rightPanel = $( '#mw-graph-right' ),
			$editor = $( '.editor' );

		if ( ccw ) {
			ccw.release();
		}
		ccw = mw.confirmCloseWindow( {
			test: function () {
				return session.getValue().length > 0;
			}
		} );

		resizeCodeEditor = function () {
			$editor.parent().height( $rightPanel.height() - 57 );
			$.wikiEditor.instances[ 0 ].data( 'wikiEditor-context' ).codeEditor.resize();
		};

		// I tried to resize on $( window ).resize(), but that didn't work right
		resizeCodeEditor();

		session.on( 'change', OO.ui.debounce( function () {
			const content = session.getValue();

			if ( oldContent === content ) {
				return;
			}
			oldContent = content;
			$graph.empty();

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
				loadGraph( $graphEl, data.graph ).then( function () {
					// graph renders successfully.
				}, function ( error ) {
					if ( error ) {
						$graphEl.textContent = ( error.exception || error ).toString();
					}
				} );
			} ).fail( function ( errCode, error ) {
				$graphEl.textContent = errCode.toString() + ':' + ( error.exception || error ).toString();
			} );
		}, 300 ) );
	} );

}() );
