( function () {
	/**
	 * Replace a graph image by the vega graph.
	 *
	 * If dependencies aren't loaded yet, they are loaded first
	 * before rendering the graph.
	 *
	 * @param {jQuery} $el Graph container.
	 */
	function loadAndReplaceWithGraph( $el ) {
		var requestPromise = new mw.Api().get( {
			formatversion: 2,
			action: 'graph',
			title: mw.config.get( 'wgPageName' ),
			oldid: mw.config.get( 'wgRevisionId' ),
			hash: $el.data( 'graphId' )
		} );
		// Lazy loading dependencies
		$.when( requestPromise, mw.loader.using( 'ext.graph.vega2' ) ).done( function ( data ) {
			mw.drawVegaGraph( $el[ 0 ], data[ 0 ].graph, function ( error ) {
				if ( error ) {
					mw.log.warn( error );
				}
				$el.removeClass( [ 'mw-graph-lazyload', 'mw-graph-loading' ] );
				// TODO: handle error by showing some message
			} );
		} );
	}

	function lazyLoader( $content ) {
		// Make graph containers clickable
		$content.find( '.mw-graph.mw-graph-lazyload' ).each( function () {
			var $this = $( this );

			// Add a class to decorate loading phase
			$this.addClass( 'mw-graph-loading' );

			// Replace the image with the graph
			loadAndReplaceWithGraph( $this );
		} );
	}

	mw.hook( 'wikipage.content' ).add( lazyLoader );

}() );
