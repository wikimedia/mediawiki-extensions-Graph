( function ( $, mw ) {
	var originalSanitize;

	// Make sure we only initialize graphs once
	vg.config.load.domainWhiteList = mw.config.get( 'wgGraphDataDomains' );
	vg.config.load.urlBlackList = mw.config.get( 'wgGraphUrlBlacklist' );
	if ( !mw.config.get( 'wgGraphIsTrusted' ) ) {
		vg.util.load.headers = { 'Treat-as-Untrusted': 1 };
	}

	originalSanitize = vg.util.load.sanitizeUrl.bind( vg.util.load );
	vg.util.load.sanitizeUrl = function ( /* opt */ ) {
		var url = originalSanitize.apply( vg.util.load, arguments );
		if ( !url ) {
			return false;
		}
		// Normalize url by parsing and re-encoding it
		url = new mw.Uri( url );
		url.path = decodeURIComponent( url.path );
		url = url.toString();
		if ( !url ) {
			return false;
		}
		if ( !vg.config.load.urlBlackListRe ) {
			// Lazy initialize urlBlackListRe
			if ( vg.config.load.urlBlackList ) {
				vg.config.load.urlBlackListRe = vg.config.load.urlBlackList.map( function ( s ) {
					return new RegExp( s );
				} );
			} else {
				vg.config.load.urlBlackListRe = [];
			}
		}
		if ( vg.config.load.urlBlackListRe.some( function ( re ) {
					return re.test( url );
				} ) ) {
			return false;
		}
		return url;
	};

	/**
	 * Set up drawing canvas inside the given element and draw graph data
	 *
	 * @param {HTMLElement} element
	 * @param {Object|string} data graph spec
	 * @param {Function} callback function(error) called when drawing is done
	 */
	mw.drawVegaGraph = function ( element, data, callback ) {
		vg.parse.spec( data, function ( error, chart ) {
			if ( !error ) {
				chart( { el: element } ).update();
			}
			callback( error );
		} );
	};

	mw.hook( 'wikipage.content' ).add( function ( $content ) {
		var specs = mw.config.get( 'wgGraphSpecs' );
		if ( !specs ) {
			return;
		}
		$content.find( '.mw-graph.mw-graph-always' ).each( function () {
			var graphId = $( this ).data( 'graph-id' );
			if ( !specs.hasOwnProperty( graphId ) ) {
				mw.log.warn( graphId );
			} else {
				mw.drawVegaGraph( this, specs[ graphId ], function ( error ) {
					if ( error ) {
						mw.log.warn( error );
					}
				} );
			}
		} );
	} );
}( jQuery, mediaWiki ) );
