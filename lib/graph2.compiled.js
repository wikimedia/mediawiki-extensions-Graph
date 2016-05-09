(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
( function ( $, mw, vg ) {

	'use strict';
	/* global require */

	var wrapper,
		VegaWrapper = require( 'graph-shared' );

	wrapper = new VegaWrapper(
		vg.util.load, true,
		mw.config.get( 'wgGraphIsTrusted' ),
		mw.config.get( 'wgGraphAllowedDomains' ),
		false,
		function ( warning ) {
			mw.log.warn( warning );
		}, $.extend, function ( opt ) {
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
			// Node's path includes the query, whereas pathname is without the query
			// Standardizing on pathname
			uri.pathname = uri.path;
			delete uri.path;
			return uri;
		}, function ( uri, opt ) {
			// Format URL back into a string
			// Revert path into pathname
			uri.path = uri.pathname;
			delete uri.pathname;

			if ( location.host.toLowerCase() === uri.host.toLowerCase() ) {
				if ( !mw.config.get( 'wgGraphIsTrusted' ) ) {
					// Only send this header when hostname is the same.
					// This is broader than the same-origin policy,
					// but playing on the safer side.
					opt.headers = { 'Treat-as-Untrusted': 1 };
				}
			} else if ( opt.isApiCall ) {
				// All CORS api calls require origin parameter.
				// It would be better to use location.origin,
				// but apparently it's not universal yet.
				uri.query.origin = location.protocol + '//' + location.host;
			}

			return uri.toString();
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
			if ( !error ) {
				chart( { el: element } ).update();
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

}( jQuery, mediaWiki, vg ) );

},{"graph-shared":3}],2:[function(require,module,exports){
'use strict';

/**
 * Convert a list of domains into an object with a test method.
 *   equivalent regex: (any-subdomain)\.(wikipedia\.org|wikivoyage\.org|...)
 *
 * @param domains array of string domains
 * @param allowSubdomains if true, allows any sub and sub-sub-* domains
 * @returns {*}
 */
module.exports = function makeValidator(domains, allowSubdomains) {
    if (!domains || domains.length === 0) return {
        // Optimization - always return false
        test: function () {
            return false;
        }
    };
    return new RegExp(
        (allowSubdomains ? '^([^@/:]*\.)?(' : '^(') +
        domains
            .map(function (s) {
                return s.replace('.', '\\.');
            })
            .join('|') + ')$', 'i');
};

},{}],3:[function(require,module,exports){
'use strict';
/* global module */

var makeValidator = require('domain-validator');

module.exports = VegaWrapper;

/**
 * Shared library to wrap around vega code
 * @param {Object} load Vega loader object to use and override
 * @param {boolean} useXhr true if we should use XHR, false for node.js http loading
 * @param {boolean} isTrusted true if the graph spec can be trusted
 * @param {Object} domains allowed protocols and a list of their domains
 * @param {string[]} domains.http
 * @param {string[]} domains.https
 * @param {string[]} domains.wikirawupload
 * @param {string[]} domains.wikidatasparql
 * @param {Object} domainMap domain remapping
 * @param {Function} logger
 * @param {Function} objExtender $.extend in browser, _.extend in NodeJs
 * @param {Function} parseUrl
 * @param {Function} formatUrl
 * @constructor
 */
function VegaWrapper(load, useXhr, isTrusted, domains, domainMap, logger, objExtender, parseUrl, formatUrl) {
    var self = this;
    self.isTrusted = isTrusted;
    self.domains = domains;
    self.logger = logger;
    self.objExtender = objExtender;
    self.parseUrl = parseUrl;
    self.formatUrl = formatUrl;

    self.httpHostsRe = makeValidator(domains.http, true);
    self.httpsHostsRe = makeValidator(domains.https, true);
    self.uploadHostsRe = makeValidator(domains.wikirawupload);
    self.sparqlHostsRe = makeValidator(domains.wikidatasparql);
    self.domainMap = domainMap;

    load.loader = function (opt, callback) {
        var error = callback || function (e) { throw e; }, url;

        try {
            url = self.sanitizeUrl(opt); // enable override
        } catch (err) {
            error(err);
            return;
        }

        // Process data response
        var cb = function (error, data) {
            return self.dataParser(error, data, opt, callback);
        };

        if (useXhr) {
            return load.xhr(url, opt, cb);
        } else {
            return load.http(url, opt, cb);
        }
    };

    load.sanitizeUrl = self.sanitizeUrl.bind(self);

    // Prevent accidental use
    load.file = function() { throw new Error('Disabled'); };
    if (useXhr) {
        load.http = load.file;
    } else {
        load.xhr = load.file;
    }
}

/**
 * Check if host was listed in the allowed domains, normalize it, and get correct protocol
 * @param {string} host
 * @returns {Object}
 */
VegaWrapper.prototype.sanitizeHost = function sanitizeHost(host) {
    // First, map the host
    host = (this.domainMap && this.domainMap[host]) || host;

    var result = {
        host: host
    };

    if (this.httpsHostsRe.test(host)) {
        result.protocol = 'https';
    } else if (this.httpHostsRe.test(host)) {
        result.protocol = 'http';
    } else {
        result = undefined;
    }

    return result;
};

/**this
 * Validate and update urlObj to be safe for client-side and server-side usage
 * @param {Object} opt passed by the vega loader. May be altered with optional "isApiCall" and "extractApiContent"
 * @returns {boolean} true on success
 */
VegaWrapper.prototype.sanitizeUrl = function sanitizeUrl(opt) {
    // In some cases we may receive a badly formed URL in a form   customprotocol:https://...
    opt.url = opt.url.replace(/^([a-z]+:)https?:\/\//, '$1//');

    var urlParts = this.parseUrl(opt);

    var sanitizedHost = this.sanitizeHost(urlParts.host);
    if (!sanitizedHost) {
        throw new Error('URL hostname is not whitelisted: ' + JSON.stringify(opt.url));
    }
    urlParts.host = sanitizedHost.host;
    if (!urlParts.protocol) {
        // Update protocol-relative URLs
        urlParts.protocol = sanitizedHost.protocol;
    }

    switch (urlParts.protocol) {
        case 'http':
        case 'https':
            if (!this.isTrusted) {
                throw new Error('HTTP and HTTPS protocols are not supported for untrusted graphs.\n' +
                    'Use wikiraw:, wikiapi:, wikirest:, and wikirawupload: protocols.\n' +
                    'See https://www.mediawiki.org/wiki/Extension:Graph#External_data');
            }
            // keep the original URL
            break;

        case 'wikiapi':
            // wikiapi:///?action=query&list=allpages
            // Call to api.php - ignores the path parameter, and only uses the query
            urlParts.query = this.objExtender(urlParts.query, {format: 'json', formatversion: '2'});
            urlParts.pathname = '/w/api.php';
            urlParts.protocol = sanitizedHost.protocol;
            opt.isApiCall = true;
            break;

        case 'wikirest':
            // wikirest:///api/rest_v1/page/...
            // Call to RESTbase api - requires the path to start with "/api/"
            // The /api/... path is safe for GET requests
            if (!/^\/api\//.test(urlParts.pathname)) {
                throw new Error('wikirest: protocol must begin with the /api/ prefix');
            }
            // keep urlParts.query
            // keep urlParts.pathname
            urlParts.protocol = sanitizedHost.protocol;
            break;

        case 'wikiraw':
            // wikiraw:///MyPage/data
            // Get raw content of a wiki page, where the path is the title
            // of the page with an additional leading '/' which gets removed.
            // Uses mediawiki api, and extract the content after the request
            // Query value must be a valid MediaWiki title string, but we only ensure
            // there is no pipe symbol, the rest is handlered by the api.
            if (!/^\/[^|]+$/.test(urlParts.pathname)) {
                throw new Error('wikiraw: invalid title');
            }
            urlParts.query = {
                format: 'json',
                formatversion: '2',
                action: 'query',
                prop: 'revisions',
                rvprop: 'content',
                titles: decodeURIComponent(urlParts.pathname.substring(1))
            };
            urlParts.pathname = '/w/api.php';
            urlParts.protocol = sanitizedHost.protocol;
            opt.isApiCall = true;
            opt.extractApiContent = true;
            break;

        case 'wikirawupload':
            // wikirawupload://upload.wikimedia.org/wikipedia/commons/3/3e/Einstein_1921.jpg
            // Get an image for the graph, e.g. from commons
            // This tag specifies any content from the uploads.* domain, without query params
            if (!this.domains.wikirawupload) {
                throw new Error('wikirawupload: protocol is disabled: ' + JSON.stringify(opt.url));
            }
            if (urlParts.isRelativeHost) {
                urlParts.host = this.domains.wikirawupload[0];
                sanitizedHost = this.sanitizeHost(urlParts.host);
            }
            if (!this.uploadHostsRe.test(urlParts.host)) {
                throw new Error('wikirawupload: protocol must only reference allowed upload hosts: ' + JSON.stringify(opt.url));
            }
            urlParts.query = {};
            // keep urlParts.pathname;
            urlParts.protocol = sanitizedHost.protocol;
            break;

        case 'wikidatasparql':
            // wikidatasparql:///?query=<QUERY>
            // Runs a SPARQL query, converting it to
            // https://query.wikidata.org/bigdata/namespace/wdq/sparql?format=json&query=...
            if (!this.domains.wikidatasparql) {
                throw new Error('wikidatasparql: protocol is disabled: ' + JSON.stringify(opt.url));
            }
            if (urlParts.isRelativeHost) {
                urlParts.host = this.domains.wikidatasparql[0];
                sanitizedHost = this.sanitizeHost(urlParts.host);
            }
            if (!this.sparqlHostsRe.test(urlParts.host)) {
                throw new Error('wikidatasparql: protocol must only reference allowed sparql hosts: ' + JSON.stringify(opt.url));
            }
            if (!urlParts.query || !urlParts.query.query) {
                throw new Error('wikidatasparql: missing query parameter in: ' + JSON.stringify(opt.url));
            }
            urlParts.query = { format: 'json', query: urlParts.query.query };
            urlParts.pathname = '/bigdata/namespace/wdq/sparql';
            urlParts.protocol = sanitizedHost.protocol;
            break;

        default:
            throw new Error('Unknown protocol ' + JSON.stringify(opt.url));
    }
    return this.formatUrl(urlParts, opt);
};

/**
 * Performs post-processing of the data requested by the graph's spec
 */
VegaWrapper.prototype.dataParser = function dataParser(error, data, opt, callback) {
    if (error) {
        callback(error);
        return;
    }
    if (opt.isApiCall) {
        // This was an API call - check for errors
        var json = JSON.parse(data);
        if (json.error) {
            error = new Error('API error: ' + JSON.stringify(json.error));
            data = undefined;
        } else {
            if (json.warnings) {
                this.logger('API warnings: ' + JSON.stringify(json.warnings));
            }
            if (opt.extractApiContent) {
                try {
                    data = json.query.pages[0].revisions[0].content;
                } catch (e) {
                    data = undefined;
                    error = new Error('Page content not available ' + opt.url);
                }
            }
        }
    }
    callback(error, data);
};

},{"domain-validator":2}]},{},[1]);
