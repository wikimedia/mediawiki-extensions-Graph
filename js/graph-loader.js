( function ( $, mw ) {

	mw.hook( 'wikipage.content' ).add( function () {

		// Make graph containers clickable
		$( '#mw-content-text' ).on( 'click', '.mw-graph-container.mw-graph-interactable', function () {
			var $this = $( this ),
				$button = $this.find( '.mw-graph-switch-button' );

			// Prevent multiple clicks
			$this.off( 'click' );

			// Add a class to decorate loading
			$this.addClass( 'mw-graph-loading' );

			$button.text( mw.message( 'graph-loading' ).text() );
			$button.addClass( 'loading' );

			// Replace the image with the graph
			loadAndReplaceWithGraph( $this );
		} );

		/**
		 * Replace a graph image by the vega graph.
		 *
		 * If dependencies aren't loaded yet, they are loaded first
		 * before rendering the graph.
		 *
		 * @param {jQuery} $el Graph container.
		 */
		function loadAndReplaceWithGraph( $el ) {
			// TODO, Performance BUG: loading vega and calling api should happen in parallel
			// Lazy loading dependencies
			mw.loader.using( 'ext.graph.vega2', function () {
				new mw.Api().get( {
					action: 'graph',
					title: mw.config.get( 'wgPageName' ),
					hash: $el.data( 'graphId' )
				} ).done( function ( data ) {
					mw.drawVegaGraph( $el[ 0 ], data.graph, function ( error ) {
						var $img = $el.find( 'img' ),
							$button = $el.find( '.mw-graph-switch-button' );

						if ( !error ) {
							$button.text( mw.message( 'graph-loading-done' ).text() );
							setTimeout( function () {
								$button.remove();
								$el.removeClass( 'mw-graph-loading' );
								$el.removeClass( 'mw-graph-interactable' );
							}, 1500 );
							$img.remove();
						}
						// TODO: handle error by showing some message
					} );
				} );
			} );
		}

	} );

}( jQuery, mediaWiki ) );
