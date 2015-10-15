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

	this.$element.addClass( 'mw-wiki-graph-container' );
};

/* Inheritance */

OO.inheritClass( ve.ce.MWGraphNode, ve.ce.MWBlockExtensionNode );

/* Static Properties */

ve.ce.MWGraphNode.static.name = 'mwGraph';

ve.ce.MWGraphNode.static.primaryCommandName = 'graph';

ve.ce.MWGraphNode.static.tagName = 'div';

/* Static Methods */

/**
 * Attempt to render the graph through Vega.
 *
 * @param {Object} spec The graph spec
 * @param {HTMLElement} element Element to render the graph in
 * @return {jQuery.Promise} Promise that resolves when the graph is rendered.
 * Promise is rejected with an error message key if there was a problem rendering the graph.
 */
ve.ce.MWGraphNode.static.vegaParseSpec = function ( spec, element ) {
	var deferred = $.Deferred(),
		node = this,
		canvasNode;

	// Check if the spec is currently valid
	if ( !ve.isEmptyObject( spec ) ) {
		vg.parse.spec( spec, function ( chart ) {
			try {
				chart( { el: element } ).update();

				// HACK: If canvas is blank, this means Vega didn't render properly.
				// Once Vega allows for proper rendering validation, this should be
				// swapped for a validation check.
				canvasNode = element.children[ 0 ].children[ 0 ];
				if ( node.isCanvasBlank( canvasNode ) ) {
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
 * @return {boolean} The canvas is blank
 */
ve.ce.MWGraphNode.static.isCanvasBlank = function ( canvas ) {
	var blank = document.createElement( 'canvas' );

	blank.width = canvas.width;
	blank.height = canvas.height;

	return canvas.toDataURL() === blank.toDataURL();
};

/* Methods */

/**
 * Render a Vega graph inside the node
 */
ve.ce.MWGraphNode.prototype.update = function () {
	var node = this;

	// Clear element
	this.$element.empty();

	if ( this.live ) {
		this.emit( 'teardown' );
	}

	this.constructor.static.vegaParseSpec( this.getModel().getSpec(), this.$element[ 0 ] ).then(
		function () {
			node.$focusable = node.$element.find( 'canvas' );
		},
		function ( failMessageKey ) {
			node.$element.text( ve.msg( failMessageKey ) );
			node.$focusable = node.$element;
		}
	).always( function () {
		if ( node.live ) {
			node.emit( 'setup' );
		}
	} );
};

/* Registration */

ve.ce.nodeFactory.register( ve.ce.MWGraphNode );
