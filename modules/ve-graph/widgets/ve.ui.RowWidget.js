/**
 * A RowWidget is used in conjunction with {@link ve.ui.TableWidget table widgets}
 * and should not be instantiated by themselves. They group together
 * {@link OO.ui.TextInputWidget text input widgets} to form a unified row of
 * editable data.
 *
 * @class
 * @extends OO.ui.Widget
 * @mixins OO.ui.GroupElement
 *
 * @constructor
 * @param {Object} [config] Configuration options
 * @cfg [string] [key] A unique key for this row. Can be used to easily reference the row instead
 * of its index in the table.
 * @cfg {string} [label] The row label to display. If not provided, the row index will be used be default.
 * If set to null, no label will be displayed.
 * @cfg {OO.ui.TextInputWidget[]} [items] Text inputs to add
 * @cfg {boolean} [deletable] Whether the table should provide deletion UI tools
 * for this row or not. Defaults to true.
 */
ve.ui.RowWidget = function VeUiRowWidget( config ) {
	// Configuration initialization
	config = config || {};
	if ( config.deletable === undefined ) {
		config.deletable = true;
	}

	// Parent constructor
	ve.ui.RowWidget.super.call( this, config );

	// Mixin constructor
	OO.ui.GroupElement.call( this, config );

	// Properties
	// TODO: The key should be stored in data to leverage getItemFromData in TableWidget
	this.key = String( config.key );
	this.rowIndex = 0;

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
	if ( config.deletable ) {
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
		labelUpdate: 'onLabelUpdate'
	} );

	if ( config.deletable ) {
		this.deleteButton.connect( this, {
			click: 'onDelete'
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

	if ( config.deletable ) {
		this.$element.append( this.deleteButton.$element );
	}

	this.setLabel( config.label );
};

/* Inheritance */

OO.inheritClass( ve.ui.RowWidget, OO.ui.Widget );
OO.mixinClass( ve.ui.RowWidget, OO.ui.GroupElement );

/* Events */

/**
 * @event change
 *
 * Change when an input contained within the row is updated
 *
 * @param {Object} The input that changed
 * @param {string} The new value of the input
 */

/**
 * @event delete
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
 * Get the row key
 *
 * @return {string} The row key
 */
ve.ui.RowWidget.prototype.getKey = function () {
	return this.key;
};

/**
 * Set the row key
 *
 * @param {string} key The new key
 */
ve.ui.RowWidget.prototype.setKey = function ( key ) {
	this.key = key;
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
 * Set the value of a particular field
 *
 * @param {string} field The field
 * @param {string} value The new value
 */
ve.ui.RowWidget.prototype.setValue = function ( field, value ) {
	var i, cells = this.getItems();

	for ( i = 0; i < cells.length; i++ ) {
		if ( cells[i].getData() === field ) {
			cells[i].setValue( value );
		}
	}
};

/**
 * Reset the field values
 */
ve.ui.RowWidget.prototype.reset = function () {
	var i, len,
		cells = this.getItems();

	for ( i = 0, len = cells.length; i < len; i++ ) {
		cells[i].setValue( '' );
	}
};

/**
 * React to cell input change
 *
 * @private
 * @param {OO.ui.TextInputWidget} input The input that fired the event
 * @param {string} value The value of the input
 * @fires change
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

	input.isValid().done( function ( isValid ) {
		if ( isValid ) {
			self.emit( 'change', input, value );
		}
	} );
};

/**
 * React to delete button click
 *
 * @private
 * @fires delete
 */
ve.ui.RowWidget.prototype.onDelete = function () {
	this.emit( 'delete' );
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
