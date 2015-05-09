( function ( $, mw ) {
	var originalSanitize = false;
	mw.hook( 'wikipage.content' ).add( function ( $content ) {
		var specs = mw.config.get( 'wgGraphSpecs' );
		if ( !specs ) {
			return;
		}
		if ( originalSanitize === false ) {
			// Make sure we only initialize graphs once
			vg.config.domainWhiteList = mw.config.get( 'wgGraphDataDomains' );
			vg.config.urlBlackList = mw.config.get( 'wgGraphUrlBlacklist' );
			if ( !mw.config.get( 'wgGraphIsTrusted' ) ) {
				vg.config.dataHeaders = { 'Treat-as-Untrusted': 1 };
			}
			vg.config.safeMode = vg.config.domainWhiteList !== false;

			originalSanitize = vg.data.load.sanitizeUrl.bind( vg.data.load );
			vg.data.load.sanitizeUrl = function ( urlOrig ) {
				var url = originalSanitize.call( vg.data.load, urlOrig );
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
				if ( !vg.config.urlBlackListRe ) {
					// Lazy initialize urlBlackListRe
					if ( vg.config.urlBlackList ) {
						vg.config.urlBlackListRe = vg.config.urlBlackList.map( function ( s ) {
							return new RegExp( s );
						} );
					} else {
						vg.config.urlBlackListRe = [];
					}
				}
				if ( vg.config.urlBlackListRe.some( function ( re ) {
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
			if ( !specs[graphId] ) {
				mw.log.warn( graphId );
			} else {
				vg.parse.spec( specs[graphId], function ( chart ) {
					if ( chart ) {
						chart( { el: el } ).update();
					}
				} );
			}
		} );
	} );
}( jQuery, mediaWiki ) );
