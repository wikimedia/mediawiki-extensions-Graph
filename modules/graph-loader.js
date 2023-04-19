( function () {
	/**
	 * @param {HTMLElement} element
	 * @return {void}
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
	 * Wires up graph interactivity which occurs when the graphs are
	 * clicked or scrolled into view.
	 */
	function lazyLoader() {
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
