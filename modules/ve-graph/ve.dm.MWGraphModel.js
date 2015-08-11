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

/* Static Methods */

/**
 * Updates a spec with new parameters.
 *
 * @param {Object} spec The spec to update
 * @param {Object} params The new params to update. Properties set to undefined will be removed from the spec.
 * @return {Object} The new spec
 */
ve.dm.MWGraphModel.static.updateSpec = function ( spec, params ) {
	var undefinedProperty,
		undefinedProperties = ve.dm.MWGraphModel.static.getUndefinedProperties( params ),
		i;

	// Remove undefined properties from spec
	for ( i = 0; i < undefinedProperties.length; i++ ) {
		undefinedProperty = undefinedProperties[i].split( '.' );
		ve.dm.MWGraphModel.static.removeProperty( spec, $.extend( [], undefinedProperty ) );
		ve.dm.MWGraphModel.static.removeProperty( params, $.extend( [], undefinedProperty ) );
	}

	// Extend remaining properties
	spec = $.extend( true, {}, spec, params );

	return spec;
};

/**
 * Recursively gets all the keys to properties set to undefined in a JSON object
 *
 * @author Based on the work on Artyom Neustroev at http://stackoverflow.com/a/15690816/2055594
 * @private
 * @param {Object} obj The object to iterate
 * @param {string} [stack] The parent property of the root property of obj. Used internally for recursion.
 * @param {array} [list] The list of properties to return. Used internally for recursion.
 * @return {array} The list of properties to return.
 */
ve.dm.MWGraphModel.static.getUndefinedProperties = function ( obj, stack, list ) {
	list = list || [];

	// Append . to the stack if it's defined
	stack = ( stack === undefined ) ? '' : stack + '.';

	for ( var property in obj ) {
		if ( obj.hasOwnProperty( property ) ) {
			if ( $.type( obj[property] ) === 'object' || $.type( obj[property] ) === 'array' ) {
				ve.dm.MWGraphModel.static.getUndefinedProperties( obj[property], stack + property, list );
			} else if ( obj[property] === undefined ) {
				list.push( stack + property );
			}
		}
	}

	return list;
};

/**
 * Removes a nested property from an object
 *
 * @param {Object} obj The object
 * @param {Array} prop The path of the property to remove
 */
ve.dm.MWGraphModel.static.removeProperty = function ( obj, prop ) {
	var firstProp = prop.shift();

	try {
		if ( prop.length > 0 ) {
			ve.dm.MWGraphModel.static.removeProperty( obj[ firstProp ], prop );
		} else {
			if ( $.type( obj ) === 'array' ) {
				obj.splice( parseInt( firstProp ), 1 );
			} else {
				delete obj[ firstProp ];
			}
		}
	} catch ( err ) {
		// We don't need to bubble errors here since hitting a missing property
		// will not exist anyway in the object anyway
	}
};

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
 * Update the spec with new parameters
 *
 * @param {Object} params The new parameters to be updated in the spec
 * @fires specChange
 */
ve.dm.MWGraphModel.prototype.updateSpec = function ( params ) {
	var updatedSpec = ve.dm.MWGraphModel.static.updateSpec( $.extend( true, {}, this.spec ), params );

	// Only emit a change event if the spec really changed
	if ( !OO.compare( this.spec, updatedSpec ) ) {
		this.spec = updatedSpec;
		this.emit( 'specChange', this.spec );
	}
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
 * Get the specification
 *
 * @return {Object} The specification
 */
ve.dm.MWGraphModel.prototype.getSpec = function () {
	return this.spec;
};

/**
 * Get the stringified specification
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
