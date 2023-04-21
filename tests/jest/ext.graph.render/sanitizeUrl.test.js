const sanitizeUrl = require( '../../../modules/ext.graph.render/sanitizeUrl.js' );

describe( 'sanitizeUrl', () => {
	test( 'Returns string if URL is trusted', () => {
		expect(
			// URL is trusted because it is defined in modules/ext.graph.render/domains.json
			// Note this is configurable in production.
			sanitizeUrl( 'https://mediawiki.org/foo.json' )
		).toBe( 'https://mediawiki.org/foo.json' );
	} );

	test( 'Throws error if URL protocol is not trusted', () => {
		expect(
			() => sanitizeUrl( 'http://mediawiki.org/foo.json' )
		).toThrowError();
	} );

	test( 'Throws error if unknown protocol', () => {
		expect(
			() => sanitizeUrl( 'gobbledegook://mediawiki.org/foo.json' )
		).toThrowError();
	} );

	test( 'Throws error for wikidatasparql:// (not implemented yet)', () => {
		expect(
			() => sanitizeUrl( 'wikidatasparql://data.json' )
		).toThrowError();
	} );

	test( 'Throws error for geoshape:// (not implemented yet)', () => {
		expect(
			() => sanitizeUrl( 'geoshape://data.json' )
		).toThrowError();
	} );

	test( 'Throws error for wikiraw:// (not implemented yet)', () => {
		expect(
			() => sanitizeUrl( 'wikiraw://data.json' )
		).toThrowError();
	} );
} );
