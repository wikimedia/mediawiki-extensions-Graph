( function ( $, mw ) {
	var originalSanitize = false;
	mw.hook( 'wikipage.content' ).add( function ( $content ) {
		var specs = mw.config.get( 'wgGraphSpecs' );
		if ( !specs ) {
			return;
		}
		if ( originalSanitize  === false ) {
			// Make sure we only initialize graphs once
			vg.config.load.domainWhiteList = mw.config.get( 'wgGraphDataDomains' );
			vg.config.load.urlBlackList = mw.config.get( 'wgGraphUrlBlacklist' );
			if ( !mw.config.get( 'wgGraphIsTrusted' ) ) {
				vg.util.load.dataHeaders = { 'Treat-as-Untrusted': 1 };
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
		}

		$content.find( '.mw-wiki-graph' ).each( function () {
			var graphId = $( this ).data( 'graph-id' ),
				el = this;
			if ( !specs[ graphId ] ) {
				mw.log.warn( graphId );
			} else {
				vg.parse.spec( specs[ graphId ], function ( chart ) {
					if ( chart ) {
						chart( { el: el } ).update();
					}
				} );
			}
		} );
	} );
}( jQuery, mediaWiki ) );
