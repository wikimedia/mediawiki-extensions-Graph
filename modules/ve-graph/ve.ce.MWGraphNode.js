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

/* Static Methods */

/**
 * Attempt to render the graph through Vega.
 *
 * @param {Object} spec The graph spec
 * @param {jQuery} $node Element to render the graph in
 * @return {jQuery.Promise} Promise that resolves when the graph is rendered.
 * Promise is rejected if there was a problem rendering the graph.
 */
ve.ce.MWGraphNode.static.vegaParseSpec = function ( spec, $node ) {
	var deferred = $.Deferred(),
		canvasNode;

	// Check if the spec is currently valid
	if ( spec ) {
		vg.parse.spec( spec, function ( chart ) {
			try {
				chart( { el: $node[0] } ).update();

				// HACK: If canvas is blank, this means Vega didn't render properly.
				// Once Vega allows for proper rendering validation, this should be
				// swapped for a validation check.
				canvasNode = $node[0].children[0].children[0];
				if ( ve.ce.MWGraphNode.static.isCanvasBlank( canvasNode ) ) {
					deferred.reject( 'graph-ve-vega-error-no-render' );
				} else {
					deferred.resolve();
				}

			} catch ( err ) {
				deferred.reject( 'graph-ve-vega-error' );
			}
		} );
	} else {
		deferred.reject( 'graph-ve-no-spec' );
	}

	return deferred.promise();
};

/**
 * Check if a canvas is blank
 *
 * @author Austin Brunkhorst http://stackoverflow.com/a/17386803/2055594
 * @param {HTMLElement} canvas The canvas to Check
 * @return True if the canvas is blank, False otherwise
 */
ve.ce.MWGraphNode.static.isCanvasBlank = function ( canvas ) {
	var blank = document.createElement( 'canvas' );

	blank.width = canvas.width;
	blank.height = canvas.height;

	return canvas.toDataURL() === blank.toDataURL();
};

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
 * @return {jQuery.Promise} Promise that resolves when the graph is rendered.
 * The promise is rejected if there was a problem rendering the graph.
 */
ve.ce.MWGraphNode.prototype.renderGraph = function () {
	var element = this.$element[0],
		spec = this.getModel().getSpec();

	// Clear element
	this.$element.empty();

	return ve.ce.MWGraphNode.static.vegaParseSpec( spec, this.$element ).then(
		null,
		function ( failMessageKey ) {
			$( element ).text( ve.msg( failMessageKey ) );
		}
	);
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
