( function ( $, mw ) {

	mw.hook( 'wikipage.content' ).add( function () {

		// Make graph containers clickable
		$( '#mw-content-text' ).on( 'click', '.mw-graph-container.mw-graph-static', function () {
			var $this = $( this );

			// Add a class to decorate loading
			$this.addClass( 'mw-graph-loading' );

			// Replace the image with the graph
			loadAndReplaceWithGraph( $this );
		} );

		/**
		 * Takes a graph container and renders the vega graph inside.
		 *
		 * @param {jQuery} $el Graph container.
		 * @param {Function} callback Method called when the graph is loaded.
		 */
		function renderGraph( $el, callback ) {
			new mw.Api().get( {
				action: 'graph',
				// TODO: is this the right way to get current page title?
				title: mw.config.get( 'wgPageName' ),
				hash: $el.data( 'graphId' )
			} ).done( function ( data ) {
				vg.parse.spec( data.graph, function ( chart ) {
					if ( chart ) {
						chart( { el: $el[ 0 ] } ).update();
					}
					callback();
				} );
			} );
		}

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
				var $img = $el.find( 'img' ),
					$button = $el.find( '.mw-graph-switch-button' );

				$button.text( mw.message( 'graph-loading' ).text() );
				$button.addClass( 'loading' );
				renderGraph( $el, function () {
					$button.text( mw.message( 'graph-loading-done' ).text() );
					setTimeout( function () {
						$el.removeClass( 'mw-graph-loading' );
						$el.removeClass( 'mw-graph-static' );
						$button.remove();
					}, 1500 );
					$img.remove();
				} );
			} );
		}

	} );

}( jQuery, mediaWiki ) );
