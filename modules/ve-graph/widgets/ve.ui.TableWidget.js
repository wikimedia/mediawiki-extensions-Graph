/**
 * A TableWidget groups {@link ve.ui.RowWidget row widgets} together to form a bidimensional
 * grid of text inputs.
 *
 * @class
 * @extends OO.ui.Widget
 * @mixins OO.ui.mixin.GroupElement
 *
 * @constructor
 * @param {string[]} fields The labels for the fields
 * @param {Object} [config] Configuration options
 * @cfg {ve.ui.RowWidget[]} [items] Rows to add
 * @cfg {boolean} [hideHeaders=false] Whether or not to hide table headers. Defaults to false.
 * @cfg {boolean} [hideRowLabels=false] Whether or not to hide row labels. Defaults to false.
 * @cfg {boolean} [disableInsertion=false] Whether or not to disable row insertion. Defaults to false.
 */
ve.ui.TableWidget = function VeUiTableWidget( fields, config ) {
	var i, len,
		headerRowItems = [],
		insertionRowItems = [];

	// Configuration initialization
	config = config || {};

	// Parent constructor
	ve.ui.TableWidget.super.call( this, config );

	// Mixin constructors
	OO.ui.mixin.GroupElement.call( this, config );

	// Properties
	this.fields = fields;
	this.listeningToInsertionRowChanges = true;
	this.hideHeaders = !!config.hideHeaders;
	this.hideRowLabels = !!config.hideRowLabels;
	this.disableInsertion = !!config.disableInsertion;

	// Set up group element
	this.setGroupElement(
		$( '<div>' )
			.addClass( 've-ui-tableWidget-rows' )
	);

	// Set up static rows
	if ( !this.hideHeaders ) {
		this.headerRow = new ve.ui.RowWidget( {
			deletable: false,
			label: null
		} );
	}
	if ( !this.disableInsertion ) {
		this.insertionRow = new ve.ui.RowWidget( {
			classes: 've-ui-rowWidget-insertionRow',
			deletable: false,
			label: null
		} );
	}

	for ( i = 0, len = fields.length; i < len; i++ ) {
		if ( !this.hideHeaders ) {
			headerRowItems.push( new OO.ui.TextInputWidget( {
				value: fields[ i ],
				// TODO: Allow editing of fields
				disabled: true
			} ) );
		}
		if ( !this.disableInsertion ) {
			insertionRowItems.push( new OO.ui.TextInputWidget( {
				data: fields[ i ]
			} ) );
		}
	}

	if ( !this.hideHeaders ) {
		this.headerRow.addItems( headerRowItems );
	}
	if ( !this.disableInsertion ) {
		this.insertionRow.addItems( insertionRowItems );
	}

	// Set up initial rows
	if ( Array.isArray( config.items ) ) {
		this.addItems( config.items );
	}

	// Events
	this.aggregate( {
		change: 'rowChange',
		delete: 'rowDelete'
	} );

	this.connect( this, {
		rowChange: 'onRowChange',
		rowDelete: 'onRowDelete',
		disable: 'onDisable'
	} );

	if ( !this.disableInsertion ) {
		this.insertionRow.connect( this, {
			change: 'onInsertionRowChange'
		} );
	}

	// Initialization
	this.$element.addClass( 've-ui-tableWidget' );

	if ( !this.hideHeaders ) {
		this.$element.append( this.headerRow.$element );
	}
	this.$element.append( this.$group );
	if ( !this.disableInsertion ) {
		this.$element.append( this.insertionRow.$element );
	}

	this.$element.toggleClass( 've-ui-tableWidget-no-labels', this.hideRowLabels );
};

/* Inheritance */

OO.inheritClass( ve.ui.TableWidget, OO.ui.Widget );
OO.mixinClass( ve.ui.TableWidget, OO.ui.mixin.GroupElement );

/* Static Properties */
ve.ui.TableWidget.static.patterns = {
	validate: /^[0-9]+(\.[0-9]+)?$/,
	filter: /[0-9]+(\.[0-9]+)?/
};

/* Events */

/**
 * @event change
 *
 * Change when the data within the table has been updated.
 *
 * @param {number} The index of the row that changed
 * @param {string} The key of the row that changed
 * @param {string} The field that changed
 * @param {string} The new value
 */

/**
 * @event deleteRow
 *
 * Fires when a row is deleted within the table
 *
 * @param {number} The index of the row being deleted
 */

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.TableWidget.prototype.addItems = function ( items ) {
	var i, len,
		startingIndex = this.items.length;

	// Parent function
	OO.ui.mixin.GroupElement.prototype.addItems.call( this, items );

	for ( i = 0, len = items.length; i < len; i++ ) {
		// Assign row index to every new row
		items[ i ].setIndex( startingIndex + i );
	}
};

/**
 * @inheritdoc
 */
ve.ui.TableWidget.prototype.removeItems = function ( items ) {
	var i, len, rows;

	// Parent function
	OO.ui.mixin.GroupElement.prototype.removeItems.call( this, items );

	// Refresh row indexes for every remaining row
	rows = this.getItems();
	for ( i = 0, len = rows.length; i < len; i++ ) {
		rows[ i ].setIndex( i );
	}
};

/**
 * Set the value of a particular cell
 *
 * @param {number|string} row The row containing the cell to edit. Can be either
 * the row index or a string key if one has been set for the row.
 * @param {string} field The field to edit
 * @param {string} value The new value
 *
 */
ve.ui.TableWidget.prototype.setValue = function ( row, field, value ) {
	var rowItem;

	if ( $.type( row ) === 'string' ) {
		rowItem = this.getRowFromKey( row );
	} else if ( $.type( row ) === 'number' ) {
		rowItem = this.getItems()[ row ];
	}

	if ( rowItem ) {
		rowItem.setValue( field, value );
	}
};

/**
 * Clears all values from the table
 */
ve.ui.TableWidget.prototype.clear = function () {
	var i, rows = this.getItems();

	for ( i = 0; i < rows.length; i++ ) {
		rows[ i ].clear();
	}
};

/**
 * Get a row from its key
 *
 * @param  {string} key The key to query
 * @return {OO.ui.RowWidget} The corresponding row, null if no row was found
 */
ve.ui.TableWidget.prototype.getRowFromKey = function ( key ) {
	var i, rows = this.getItems();

	// TODO: Leverage OO.ui.mixin.GroupElement#getItemFromData instead of looping rows
	for ( i = 0; i < rows.length; i++ ) {
		if ( rows[ i ].getKey() === key ) {
			return rows[ i ];
		}
	}

	return null;
};

/**
 * React to changes bubbled up from event aggregation
 *
 * @private
 * @param {Object} row The row that changed
 * @param {Object} input The input within the row that changed
 * @param {string} value The new value of the input
 * @fires change
 */
ve.ui.TableWidget.prototype.onRowChange = function ( row, input, value ) {
	var rowIndex = row.getIndex(),
		rowKey = row.getKey(),
		field = input.getData();

	this.emit( 'change', rowIndex, rowKey, field, value );
};

/**
 * React to new row input
 *
 * @private
 * @param {OO.ui.TextInputWidget} input The input that fired the change
 * @param {string} value The new row value
 */
ve.ui.TableWidget.prototype.onInsertionRowChange = function ( input, value ) {
	var i, len, inputToFocus, newInput,
		self = this,
		newRow = new ve.ui.RowWidget(),
		inputs = [];

	if ( this.listeningToInsertionRowChanges ) {
		// Create new data row
		for ( i = 0, len = this.fields.length; i < len; i++ ) {
			newInput = new OO.ui.TextInputWidget( {
				data: this.fields[ i ],
				// FIXME: Allow other insertion validation patterns via a config property
				validate: ve.ui.TableWidget.static.patterns.validate,
				inputFilter: self.filterCellInput
			} );

			// If this is the field being changed, set its value to the new input
			// and tag it so we can focus it once it's added to the table
			if ( input.getData() === this.fields[ i ] ) {
				inputToFocus = newInput;
			}

			inputs.push( newInput );
		}

		// Add new row to table
		newRow.addItems( inputs );
		this.addItems( [ newRow ] );

		// Focus new input and trigger data entry
		inputToFocus.setValue( value );
		inputToFocus.focus();

		// Reset insertion row
		this.listeningToInsertionRowChanges = false;
		this.insertionRow.clear();
		this.listeningToInsertionRowChanges = true;
	}
};

/**
 * React to row deletion input
 *
 * @private
 * @param {ve.ui.RowWidget} row The row that asked for the deletion
 * @fires deleteRow
 */
ve.ui.TableWidget.prototype.onRowDelete = function ( row ) {
	var rowIndex = row.getIndex();

	this.removeItems( [ row ] );

	this.emit( 'deleteRow', rowIndex );
};

/**
 * Handle disabled state changes
 *
 * @param  {boolean} disabled New disabled state
 */
ve.ui.TableWidget.prototype.onDisable = function ( disabled ) {
	var i,
		rows = this.getItems();

	for ( i = 0; i < rows.length; i++ ) {
		rows[ i ].setDisabled( disabled );
	}
};

/**
 * Filter cell input once it is changed
 *
 * @param {string} value The input value
 * @return {string} The filtered input
 */
ve.ui.TableWidget.prototype.filterCellInput = function ( value ) {
	var matches = value.match( ve.ui.TableWidget.static.patterns.filter );
	return ( Array.isArray( matches ) ) ? matches[ 0 ] : '';
};
