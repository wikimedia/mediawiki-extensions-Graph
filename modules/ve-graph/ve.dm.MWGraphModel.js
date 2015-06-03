/*!
 * VisualEditor DataModel MWGraphModel class.
 *
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * MediaWiki graph model.
 *
 * @class
 * @mixins OO.EventEmitter
 *
 * @constructor
 * @param {Object} [spec] The Vega specification as a JSON object
 */
ve.dm.MWGraphModel = function VeDmMWGraphModel( spec ) {
	// Mixin constructors
	OO.EventEmitter.call( this );

	// Properties
	this.spec = spec || {};
	this.originalSpec = ve.copy( this.spec );
};

/* Inheritance */

OO.mixinClass( ve.dm.MWGraphModel, OO.EventEmitter );

/* Events */

/**
 * @event specChange
 *
 * Change when the JSON specification is updated
 *
 * @param {Object} The new specification
 */

/* Methods */

/**
 * Apply changes to the node
 *
 * @param {ve.dm.MWGraphNode} node The node to be modified
 * @param {ve.dm.Surface} surfaceModel The surface model for the document
 */
ve.dm.MWGraphModel.prototype.applyChanges = function ( node, surfaceModel ) {
	var mwData = ve.copy( node.getAttribute( 'mw' ) );

	// Send transaction
	mwData.body.extsrc = this.getSpecString();
	surfaceModel.change(
		ve.dm.Transaction.newFromAttributeChanges(
			surfaceModel.getDocument(),
			node.getOffset(),
			{ mw: mwData }
		)
	);
};

/**
 * Sets and validates the specification from a stringified version
 *
 * @param {string} str The new specification string
 * @fires specChange
 */
ve.dm.MWGraphModel.prototype.setSpecFromString = function ( str ) {
	var newSpec = ve.dm.MWGraphNode.static.parseSpecString( str );

	// Only apply changes if the new spec is valid JSON and if the
	// spec truly was modified
	if ( !OO.compare( this.spec, newSpec ) ) {
		this.spec = newSpec;
		this.emit( 'specChange', this.spec );
	}
};

/**
 * Get the specification string
 *
 * @return {string} The specification string
 */
ve.dm.MWGraphModel.prototype.getSpecString = function () {
	return ve.dm.MWGraphNode.static.stringifySpec( this.spec );
};

/**
 * Get the original stringified specificiation
 *
 * @return {string} The original JSON string specification
 */
ve.dm.MWGraphModel.prototype.getOriginalSpecString = function () {
	return ve.dm.MWGraphNode.static.stringifySpec( this.originalSpec );
};

/**
 * Returns whether the current spec has been modified since the dialog was opened
 *
 * @return {boolean} The spec was changed
 */
ve.dm.MWGraphModel.prototype.hasBeenChanged = function () {
	return !OO.compare( this.spec, this.originalSpec );
};
