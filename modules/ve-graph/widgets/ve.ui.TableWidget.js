/**
 * A TableWidget groups {@link ve.ui.RowWidget row widgets} together to form a bidimensional
 * grid of text inputs.
 *
 * @class
 * @extends OO.ui.Widget
 * @mixins OO.ui.GroupElement
 *
 * @constructor
 * @param {string[]} fields The labels for the fields
 * @param {Object} [config] Configuration options
 * @cfg {ve.ui.RowWidget[]} [items] Rows to add
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
	OO.ui.GroupElement.call( this, config );

	// Properties
	this.fields = fields;
	this.listeningToInsertionRowChanges = true;

	// Set up group element
	this.setGroupElement(
		$( '<div>' )
			.addClass( 've-ui-tableWidget-rows' )
	);

	// Set up static rows
	this.headerRow = new ve.ui.RowWidget( {
		deletable: false
	} );

	this.insertionRow = new ve.ui.RowWidget( {
		classes: 've-ui-rowWidget-insertionRow',
		deletable: false
	} );

	for ( i = 0, len = fields.length; i < len; i++ ) {
		headerRowItems.push( new OO.ui.TextInputWidget( {
			value: fields[i],
			// TODO: Allow editing of fields
			disabled: true
		} ) );

		insertionRowItems.push( new OO.ui.TextInputWidget( {
			data: fields[i]
		} ) );
	}

	this.headerRow.addItems( headerRowItems );
	this.insertionRow.addItems( insertionRowItems );

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
		rowDelete: 'onRowDelete'
	} );

	this.insertionRow.connect( this, {
		change: 'onInsertionRowChange'
	} );

	// Initialization
	this.$element.addClass( 've-ui-tableWidget' );

	this.$element.append(
		this.headerRow.$element,
		this.$group,
		this.insertionRow.$element
	);
};

/* Inheritance */

OO.inheritClass( ve.ui.TableWidget, OO.ui.Widget );
OO.mixinClass( ve.ui.TableWidget, OO.ui.GroupElement );

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
 * @param {number} The entry index that changed
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
	OO.ui.GroupElement.prototype.addItems.call( this, items );

	for ( i = 0, len = items.length; i < len; i++ ) {
		// Assign row index to every new row
		items[i].setIndex( startingIndex + i );
	}
};

/**
 * @inheritdoc
 */
ve.ui.TableWidget.prototype.removeItems = function ( items ) {
	var i, len,
		rows = this.getItems();

	// Parent function
	OO.ui.GroupElement.prototype.removeItems.call( this, items );

	// Refresh row indexes for every remaining row
	for ( i = 0, len = rows.length; i < len; i++ ) {
		rows[i].setIndex( i );
	}
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
		field = input.getData();

	this.emit( 'change', rowIndex, field, value );
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
				data: this.fields[i],
				// FIXME: Allow other insertion validation patterns via a config property
				validate: ve.ui.TableWidget.static.patterns.validate,
				inputFilter: self.filterCellInput
			} );

			// If this is the field being changed, set its value to the new input
			// and tag it so we can focus it once it's added to the table
			if ( input.getData() === this.fields[i] ) {
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
		this.insertionRow.reset();
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
 * Filter cell input once it is changed
 *
 * @param {string} value The input value
 * @return {string} The filtered input
 */
ve.ui.TableWidget.prototype.filterCellInput = function ( value ) {
	var matches = value.match( ve.ui.TableWidget.static.patterns.filter );
	return ( Array.isArray( matches ) ) ? matches[0] : '';
};
