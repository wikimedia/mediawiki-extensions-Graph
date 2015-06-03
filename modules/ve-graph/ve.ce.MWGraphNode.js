/*!
 * VisualEditor ContentEditable MWGraphNode class.
 *
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * ContentEditable MediaWiki graph node.
 *
 * @class
 * @extends ve.ce.MWBlockExtensionNode
 *
 * @constructor
 * @param {ve.dm.MWGraphNode} model Model to observe
 * @param {Object} [config] Configuration options
 */
ve.ce.MWGraphNode = function VeCeMWGraphNode() {
	// Parent constructor
	ve.ce.MWGraphNode.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.ce.MWGraphNode, ve.ce.MWBlockExtensionNode );

/* Static Properties */

ve.ce.MWGraphNode.static.name = 'mwGraph';

ve.ce.MWGraphNode.static.primaryCommandName = 'graph';

/* Methods */

/**
 * @inheritdoc
 */
ve.ce.MWGraphNode.prototype.onSetup = function () {
	// Parent method
	ve.ce.MWGraphNode.super.prototype.onSetup.call( this );

	// Events
	this.getModel().connect( this, {
		specChange: 'onSpecChange'
	} );

	// Initial rendering
	this.renderGraph();
};

/**
 * @inheritdoc
 */
ve.ce.MWGraphNode.prototype.onTeardown = function () {
	// Parent method
	ve.ce.MWGraphNode.super.prototype.onTeardown.call( this );

	// Events
	this.getModel().disconnect( this );
};

/**
 * Render a Vega graph inside the node
 *
 * @private
 */
ve.ce.MWGraphNode.prototype.renderGraph = function () {
	var element = this.$element[0],
		spec = this.getModel().getSpec();

	// Check if the spec is currently valid
	if ( spec !== null ) {
		vg.parse.spec( spec, function ( chart ) {
			chart( { el: element } ).update();
		} );
	} else {
		$( element ).text( ve.msg( 'graph-ve-no-spec' ) );
	}
};

/**
 * React to specification model update
 *
 * @private
 */
ve.ce.MWGraphNode.prototype.onSpecChange = function () {
	this.renderGraph();
};

/* Registration */

ve.ce.nodeFactory.register( ve.ce.MWGraphNode );
