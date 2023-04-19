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

	/**
	 * @param {HTMLElement} element
	 */
	function loadGraphElement( element ) {
		if ( !element.classList.contains( 'mw-graph-clickable' ) ) {
			return;
		}
		element.classList.remove( 'mw-graph-clickable' );
		element.classList.add( 'mw-graph-clickable-loading' );
		mw.loader.using( 'ext.graph.lite' ).then( ( require ) => {
			require( 'ext.graph.lite' )( element ).then( () => {
				element.classList.remove( 'mw-graph-clickable-loading' );
			}, ( msg ) => {
				element.classList.add( 'mw-graph-clickable-error' );
				throw new Error( msg );
			} );
		} );
	}

	/**
	 * @param {Event} ev
	 */
	function loadGraph( ev ) {
		loadGraphElement( ev.target );
	}

	/**
	 * @param {jQuery.Object} $content
	 */
	function lazyLoader( $content ) {
		// Make graph containers clickable
		$content.find( '.mw-graph.mw-graph-lazyload' ).each( function () {
			var $this = $( this );

			// Add a class to decorate loading phase
			$this.addClass( 'mw-graph-loading' );

			// Replace the image with the graph
			loadAndReplaceWithGraph( $this );
		} );

		$( document ).on( 'click', '.mw-graph-clickable', loadGraph );
		// Load graphs as they scroll into view for browsers that support it.
		if ( 'IntersectionObserver' in window ) {
			const observer = new IntersectionObserver(
				( entries ) => {
					entries.forEach( ( entry ) => {
						const element = entry.target;
						// If intersecting load image and stop observing it to free up resources.
						if ( entry.isIntersecting ) {
							loadGraphElement( element );
							observer.unobserve( element );
						}
					} );
				},
				// See https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
				{
					// Setup the area for observing.
					// By default the root is the viewport.
					// We want the detection area to be as tall as 150% of the viewport height,
					// allowing elements to be detected before they reach the viewport.
					// This is achieved with a 50% bottom margin.
					rootMargin: '0px 0px 50% 0px',
					// The default is 0 (meaning as soon as even one pixel is visible,
					// the callback will be run), however we explicitly set this so that
					// it is clear we have made this choice in case we want to revisit later.
					threshold: 0
				}
			);
			// observe all the placeholders
			document.querySelectorAll( '.mw-graph-clickable' ).forEach( ( placeholder ) => {
				observer.observe( placeholder );
			} );
		}
	}

	mw.hook( 'wikipage.content' ).add( lazyLoader );

}() );
