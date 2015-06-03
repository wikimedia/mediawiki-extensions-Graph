/*!
 * VisualEditor DataModel MWGraphNode class.
 *
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * DataModel MediaWiki graph node.
 *
 * @class
 * @extends ve.dm.MWBlockExtensionNode
 *
 * @constructor
 * @param {Object} [element]
 */
ve.dm.MWGraphNode = function VeDmMWGraphNode() {
	var mw, extsrc;

	// Parent constructor
	ve.dm.MWGraphNode.super.apply( this, arguments );

	// Properties
	this.spec = null;

	// Initialize specificiation
	mw = this.getAttribute( 'mw' );
	extsrc = ve.getProp( mw, 'body', 'extsrc' );

	if ( extsrc !== undefined ) {
		this.setSpecFromString( extsrc );
	}
};

/* Inheritance */

OO.inheritClass( ve.dm.MWGraphNode, ve.dm.MWBlockExtensionNode );

/* Static Members */

ve.dm.MWGraphNode.static.name = 'mwGraph';

ve.dm.MWGraphNode.static.tagName = 'graph';

ve.dm.MWGraphNode.static.extensionName = 'graph';

/* Events */

/**
 * @event specChange
 *
 * Change when the specification object is updated
 *
 * @param {Object} The new specification object
 */

/* Static Methods */

/**
 * Parses a spec string and returns its object representation.
 *
 * @param {string} str The spec string to validate
 * @return {Object|null} The object specification if the parsing was successful, null otherwise
 */
ve.dm.MWGraphNode.static.parseSpecString = function ( str ) {
	try {
		return JSON.parse( str );
	} catch ( err ) {
		return null;
	}
};

/* Methods */

/**
 * Get the specification string
 *
 * @return {string} The specification JSON string
 */
ve.dm.MWGraphNode.prototype.getSpecString = function () {
	return JSON.stringify( this.spec, null, '\t' );
};

/**
 * Get the parsed JSON specification
 *
 * @return {Object} The specification object
 */
ve.dm.MWGraphNode.prototype.getSpec = function () {
	return this.spec;
};

/**
 * Update the spec with new parameters
 *
 * @param {Object} params The new parameters to be updated in the spec
 * @fires specChange
 */
ve.dm.MWGraphNode.prototype.updateSpec = function ( params ) {
	this.spec = $.extend( {}, this.spec, params );

	this.emit( 'specChange', this.spec );
};

/**
 * Set the specification from a stringified version
 *
 * @param {string} str The new specification JSON string
 * @fires specChange
 */
ve.dm.MWGraphNode.prototype.setSpecFromString = function ( str ) {
	this.spec = ve.dm.MWGraphNode.static.parseSpecString( str );

	this.emit( 'specChange', this.spec );
};

/* Registration */

ve.dm.modelRegistry.register( ve.dm.MWGraphNode );
