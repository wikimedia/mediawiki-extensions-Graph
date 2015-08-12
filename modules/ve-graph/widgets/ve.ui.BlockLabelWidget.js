
/**
 * BlockLabelWidgets are a special type of {@link OO.ui.LabelWidget LabelWidgets} that
 * render as a block instead of inline.
 *
 * @class
 * @extends OO.ui.LabelWidget
 *
 * @constructor
 * @param {Object} config Configuration options
 */
ve.ui.BlockLabelWidget = function VeUiBlockLabelWidget( config ) {
	// Configuration initialization
	config = config || {};

	// Parent constructor
	ve.ui.BlockLabelWidget.parent.call( this, config );

	// Initialization
	this.$element.addClass( 've-ui-blockLabelWidget' );
};

/* Inheritance */

OO.inheritClass( ve.ui.BlockLabelWidget, OO.ui.LabelWidget );

/* Static Properties */

ve.ui.BlockLabelWidget.static.tagName = 'div';
