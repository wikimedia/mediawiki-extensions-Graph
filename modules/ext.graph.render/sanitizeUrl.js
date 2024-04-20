const allowedDomains = require( './domains.json' ).GraphAllowedDomains;
const allowHttp = require( './domains.json' ).GraphAllowHttp;

/**
 * @param {Object} urlObj
 * @param {Object} domains
 * @return {boolean}
 */
const isDomainTrusted = ( urlObj, domains ) => {
	const subdomains = urlObj.host.split( '.' );
	return subdomains.some( ( _part, i ) => {
		const hostToTest = subdomains.slice( i ).join( '.' );
		return domains.indexOf( hostToTest ) > -1;
	} );
};

/**
 * @param {string} url
 * @throws {Error} if unsupported URL
 * @return {string} sanitized url
 */
function sanitizeUrl( url ) {
	const urlObj = new URL( url );
	const protocol = urlObj.protocol;
	if ( !( protocol === 'https:' || protocol === 'http:' && allowHttp ) ) {
		throw new Error( `The protocol ${ protocol } is currently not supported.` );
	}
	const domains = allowedDomains[ protocol.slice( 0, -1 ) ] || [];
	if ( isDomainTrusted( urlObj, domains ) ) {
		return url;
	} else {
		throw new Error( `The host ${ urlObj.host } is not in the list of trusted domains for the protocol ${ protocol }` );
	}
}

module.exports = sanitizeUrl;
