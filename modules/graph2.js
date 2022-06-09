( function () {

	'use strict';

	var VegaWrapper = require( 'mw-graph-shared' );

	// eslint-disable-next-line no-new
	new VegaWrapper( {
		datalib: vg.util,
		useXhr: true,
		isTrusted: false,
		domains: mw.config.get( 'wgGraphAllowedDomains' ),
		domainMap: false,
		logger: function ( warning ) {
			mw.log.warn( warning );
		},
		parseUrl: function ( opt ) {
			// Parse URL
			var uri = new mw.Uri( opt.url );
			// reduce confusion, only keep expected values
			if ( uri.port ) {
				uri.host += ':' + uri.port;
				delete uri.port;
			}
			// If url begins with   protocol:///...  mark it as having relative host
			if ( /^[a-z]+:\/\/\//.test( opt.url ) ) {
				uri.isRelativeHost = true;
			}
			if ( uri.protocol ) {
				// All other libs use trailing colon in the protocol field
				uri.protocol += ':';
			}
			// Node's path includes the query, whereas pathname is without the query
			// Standardizing on pathname
			uri.pathname = uri.path;
			delete uri.path;
			return uri;
		},
		formatUrl: function ( uri, opt ) {
			// Format URL back into a string
			// Revert path into pathname
			uri.path = uri.pathname;
			delete uri.pathname;

			if ( location.host.toLowerCase() === uri.host.toLowerCase() ) {
				// Only send this header when hostname is the same.
				// This is broader than the same-origin policy,
				// but playing on the safer side.
				opt.headers = { 'Treat-as-Untrusted': 1 };
			} else if ( opt.addCorsOrigin ) {
				// All CORS api calls require origin parameter.
				uri.query.origin = '*';
			}

			uri.protocol = VegaWrapper.removeColon( uri.protocol );

			return uri.toString();
		},
		languageCode: mw.config.get( 'wgUserLanguage' ),
		scriptPath: mw.config.get( 'wgScriptPath' )
	} );

	/**
	 * Set up drawing canvas inside the given element and draw graph data
	 *
	 * @param {HTMLElement} element
	 * @param {Object|string} data graph spec
	 * @param {Function} [callback] function(error) called when drawing is done
	 */
	mw.drawVegaGraph = function ( element, data, callback ) {
		vg.parse.spec( data, function ( error, chart ) {
			var id;
			if ( !error ) {
				try {
					chart( { el: element } ).update();
				} catch ( e ) {
					// Graphs come from user generated content and may contain errors.
					// When these occur, log them, but do not send them to Wikimedia servers (T274557)
					id = element.getAttribute( 'data-graph-id' ) || 'unknown';
					mw.log.error( 'Error loading graph with data-graph-id=' + id + ':' + e );
				}
			}
			if ( callback ) {
				callback( error );
			}
		} );
	};

	mw.hook( 'wikipage.content' ).add( function ( $content ) {
		var specs = mw.config.get( 'wgGraphSpecs' );
		if ( !specs ) {
			return;
		}
		$content.find( '.mw-graph.mw-graph-always' ).each( function () {
			var graphId = $( this ).data( 'graph-id' );
			if ( !Object.prototype.hasOwnProperty.call( specs, graphId ) ) {
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

}() );
