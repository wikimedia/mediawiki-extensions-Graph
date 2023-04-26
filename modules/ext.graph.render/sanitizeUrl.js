const allowedDomains = require( './domains.json' );

/**
 * @param {string} url
 * @throws {Error} if unsupported URL
 * @return {string} sanitized url
 */
function sanitizeUrl( url ) {
	const urlObj = new URL( url );
	const protocol = urlObj.protocol;
	if ( protocol !== 'https:' ) {
		throw new Error( `The protocol ${protocol} is currently not supported.` );
	}
	const domains = allowedDomains[ protocol.slice( 0, -1 ) ] || [];
	if ( domains.indexOf( urlObj.host ) > -1 ) {
		return url;
	} else {
		throw new Error( `The host ${urlObj.host} is not in the list of trusted domains` );
	}
}

module.exports = sanitizeUrl;
