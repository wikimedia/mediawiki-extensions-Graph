/**
 * A RowWidget is used in conjunction with {@link ve.ui.TableWidget table widgets}
 * and should not be instantiated by themselves. They group together
 * {@link OO.ui.TextInputWidget text input widgets} to form a unified row of
 * editable data.
 *
 * @class
 * @extends OO.ui.Widget
 * @mixins OO.ui.mixin.GroupElement
 *
 * @constructor
 * @param {Object} [config] Configuration options
 * @cfg {Array} [data] The data of the cells
 * @cfg {string} [label] The row label to display. If not provided, the row index will
 * be used be default. If set to null, no label will be displayed.
 * @cfg {boolean} [deletable=true] Whether the table should provide deletion UI tools
 * for this row or not. Defaults to true.
 */
ve.ui.RowWidget = function VeUiRowWidget( config ) {
	config = config || {};

	// Parent constructor
	ve.ui.RowWidget.super.call( this, config );

	// Mixin constructor
	OO.ui.mixin.GroupElement.call( this, config );

	// Properties
	this.deletable = ( config.deletable !== undefined ) ? config.deletable : true;

	// Set up group element
	this.setGroupElement(
		$( '<div>' )
			.addClass( 've-ui-rowWidget-cells' )
	);

	// Set up label
	this.labelCell = new OO.ui.LabelWidget( {
		classes: [ 've-ui-rowWidget-label' ]
	} );

	// Set up delete button
	if ( this.deletable ) {
		this.deleteButton = new OO.ui.ButtonWidget( {
			icon: { default: 'remove' },
			classes: [ 've-ui-rowWidget-delete-button' ],
			flags: 'destructive',
			title: ve.msg( 'graph-ve-dialog-edit-table-row-delete' )
		} );
	}

	// Events
	this.aggregate( {
		change: 'cellChange'
	} );

	this.connect( this, {
		cellChange: 'onCellChange',
		labelUpdate: 'onLabelUpdate',
		disable: 'onDisable'
	} );

	if ( this.deletable ) {
		this.deleteButton.connect( this, {
			click: 'onDeleteButtonClick'
		} );
	}

	// Initialization
	this.$element.addClass( 've-ui-rowWidget' );

	if ( Array.isArray( config.items ) ) {
		this.addItems( config.items );
	}

	this.$element.append(
		this.labelCell.$element,
		this.$group
	);

	if ( this.deletable ) {
		this.$element.append( this.deleteButton.$element );
	}

	this.setLabel( config.label );
};

/* Inheritance */

OO.inheritClass( ve.ui.RowWidget, OO.ui.Widget );
OO.mixinClass( ve.ui.RowWidget, OO.ui.mixin.GroupElement );

/* Events */

/**
 * @event inputChange
 *
 * Change when an input contained within the row is updated
 *
 * @param {number} The index of the cell that changed
 * @param {string} The new value of the cell
 */

/**
 * @event deleteButtonClick
 *
 * Fired when the delete button for the row is pressed
 */

/**
 * @event labelUpdate
 *
 * Fired when the label might need to be updated
 */

/* Methods */

/**
 * @private
 * @inheritdoc
 */
ve.ui.RowWidget.prototype.addItems = function ( items, index ) {
	var i, len,
		startingIndex = this.items.length;

	// Parent function
	OO.ui.mixin.GroupElement.prototype.addItems.call( this, items, index );

	// Apply column index as data to every new text input
	for ( i = 0, len = items.length; i < len; i++ ) {
		items[ i ].setData( {
			index: startingIndex + i
		} );
	}
};

/**
 * Get the row index
 *
 * @return {number} The row index
 */
ve.ui.RowWidget.prototype.getIndex = function () {
	return this.rowIndex;
};

/**
 * Set the row index
 *
 * @param {number} index The new index
 * @fires labelUpdate
 */
ve.ui.RowWidget.prototype.setIndex = function ( index ) {
	if ( this.rowIndex !== index ) {
		this.rowIndex = index;
		this.emit( 'labelUpdate' );
	}
};

/**
 * Get the label displayed on the row. If no custom label is set, the
 * row index is used instead.
 *
 * @return {string} The row label
 */
ve.ui.RowWidget.prototype.getLabel = function () {
	if ( this.label === null ) {
		return '';
	} else if ( !this.label ) {
		return this.rowIndex.toString();
	} else {
		return this.label;
	}
};

/**
 * Set the label to be displayed on the widget.
 *
 * @param {string} label The new label
 * @fires labelUpdate
 */
ve.ui.RowWidget.prototype.setLabel = function ( label ) {
	if ( this.label !== label ) {
		this.label = label;
		this.emit( 'labelUpdate' );
	}
};

/**
 * Set the value of a particular cell
 *
 * @param {number} index The cell index
 * @param {string} value The new value
 */
ve.ui.RowWidget.prototype.setValue = function ( index, value ) {
	if ( this.getItems()[ index ] ) {
		this.getItems()[ index ].setValue( value );
	}
};

/**
 * Removes a column at a specified index
 *
 * @param {number} index The index to removeColumn
 */
ve.ui.RowWidget.prototype.removeColumn = function ( index ) {
	var items = this.getItems();

	// Exit early if an invalid index was given
	if ( index < 0 || index >= items.length ) {
		return;
	}

	this.removeItems( items[ index ] );
};

/**
 * Clear the field values
 */
ve.ui.RowWidget.prototype.clear = function () {
	var i, len,
		cells = this.getItems();

	for ( i = 0, len = cells.length; i < len; i++ ) {
		cells[ i ].setValue( '' );
	}
};

/**
 * React to cell input change
 *
 * @private
 * @param {OO.ui.TextInputWidget} input The input that fired the event
 * @param {string} value The value of the input
 * @fires inputChange
 */
ve.ui.RowWidget.prototype.onCellChange = function ( input, value ) {
	// FIXME: The table itself should know if it contains invalid data
	// in order to pass form state to the dialog when it asks if the Apply
	// button should be enabled or not. This probably requires the table
	// and each individual row to handle validation through an array of promises
	// fed from the cells within.
	// Right now, the table can't know if it's valid or not because the events
	// don't get passed through.
	var self = this;

	input.getValidity().done( function () {
		self.emit( 'inputChange', input.getData().index, value );
	} );
};

/**
 * React to delete button click
 *
 * @private
 * @fires deleteButtonClick
 */
ve.ui.RowWidget.prototype.onDeleteButtonClick = function () {
	this.emit( 'deleteButtonClick' );
};

/**
 * Update the label displayed on the widget
 */
ve.ui.RowWidget.prototype.onLabelUpdate = function () {
	var newLabel = this.label;

	if ( newLabel === null ) {
		newLabel = '';
	} else if ( !newLabel ) {
		newLabel = this.rowIndex.toString();
	}

	this.labelCell.setLabel( newLabel );
};

/**
 * Handle disabled state changes
 *
 * @param  {boolean} disabled The new disabled state
 */
ve.ui.RowWidget.prototype.onDisable = function ( disabled ) {
	var i,
		cells = this.getItems();

	for ( i = 0; i < cells.length; i++ ) {
		cells[ i ].setDisabled( disabled );
	}
};
