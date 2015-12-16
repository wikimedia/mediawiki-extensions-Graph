( function ( $, mw ) {
	var originalSanitize, originalLoader;

	vg.config.load.domainWhiteList = mw.config.get( 'wgGraphDataDomains' );

	vg.util.load.file = vg.util.load.http = function ( url, opt, callback ) {
		callback( new Error( 'Loading of ' + url + ' is not allowed' ) );
	};

	// Override loader so that we can do post-loader data processing
	originalLoader = vg.util.load.loader.bind( vg.util.load );
	vg.util.load.loader = function ( opt, callback ) {
		return originalLoader.call( vg.util.load, opt, function ( error, data ) {
			var json;

			if ( error ) {
				callback( error );
				return;
			}
			if ( opt.isApiCall ) {
				// This was an API call - check for errors
				json = JSON.parse( data ) ;
				if ( json.error ) {
					error = new Error( 'API error: ' + JSON.stringify( json.error ) );
					data = undefined;
				} else {
					if ( json.warnings ) {
						mw.log( 'API warnings: ' + JSON.stringify( json.warnings ) );
					}
					if ( opt.extractApiContent ) {
						try {
							data = json.query.pages[ 0 ].revisions[ 0 ].content;
						} catch ( e ) {
							data = undefined;
							error = new Error( 'Page content not available ' + opt.url );
						}
					}
				}
			}
			callback( error, data );
		} );
	};

	// Override sanitizer to implement custom protocols and extra validation
	originalSanitize = vg.util.load.sanitizeUrl.bind( vg.util.load );
	vg.util.load.sanitizeUrl = function ( opt ) {
		var path, query,
			url = new mw.Uri( opt.url );

		switch ( url.protocol ) {
			case 'http':
			case 'https':
				// Will disable this as soon as all graphs have been switched to custom protocols
				// unless mw.config.get( 'wgGraphIsTrusted' ) is true
				path = decodeURIComponent( url.path );
				query = url.query;
				break;

			case 'wikiapi':
				// wikiapi:///?action=query&list=allpages
				// Call to api.php - ignores the path parameter, and only uses the query
				path = '/w/api.php';
				query = $.extend( url.query, { format: 'json', formatversion: 'latest' } );
				opt.isApiCall = true;
				break;

			case 'wikirest':
				// wikirest:///api/rest_v1/page/...
				// Call to RESTbase api - requires the path to start with "/api/"
				if ( !/^\/api\//.test( url.path ) ) {
					return false;
				}
				path = url.path;
				query = url.query;
				break;

			case 'wikiraw':
				// wikiraw:///MyPage/data
				// Get raw content of a wiki page, where the path is the title
				// of the page with an additional leading '/' which gets removed.
				// Uses mediawiki api, and extract the content after the request
				path = '/w/api.php';
				query = {
					format: 'json',
					formatversion: 'latest',
					action: 'query',
					prop: 'revisions',
					rvprop: 'content',
					titles: url.path.substring( 1 )
				};
				opt.isApiCall = true;
				opt.extractApiContent = true;
				break;

			case 'wikirawupload':
				// wikirawupload://upload.wikimedia.org/wikipedia/commons/3/3e/Einstein_1921_by_F_Schmutzer_-_restoration.jpg
				// Get an image for the graph, e.g. from commons
				// This tag specifies any content from the uploads.* domain, without query params
				if ( !/^upload\./.test( url.host ) ) {
					return false;
				}
				path = url.path;
				break;
		}

		opt.url = new mw.Uri( {
			host: url.host,
			port: url.port,
			path: path,
			query: query
		} ).toString();

		if ( !mw.config.get( 'wgGraphIsTrusted' ) &&
			window.location.hostname.toLowerCase() === url.host.toLowerCase()
		) {
			// Only send this header when hostname is the same
			// This is broader than the same-origin policy, but playing on the safer side
			opt.headers = { 'Treat-as-Untrusted': 1 };
		}

		return originalSanitize.call( vg.util.load, opt );
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
