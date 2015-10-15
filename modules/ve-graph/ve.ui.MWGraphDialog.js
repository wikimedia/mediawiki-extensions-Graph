/*!
 * VisualEditor UserInterface MWGraphDialog class.
 *
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * MediaWiki graph dialog.
 *
 * @class
 * @extends ve.ui.NodeDialog
 *
 * @constructor
 * @param {Object} [element]
 */
ve.ui.MWGraphDialog = function VeUiMWGraphDialog() {
	// Parent constructor
	ve.ui.MWGraphDialog.super.apply( this, arguments );

	// Properties
	this.graphModel = null;
	this.mode = '';
	this.cachedRawData = null;
	this.changingJsonTextInput = false;
};

/* Inheritance */

OO.inheritClass( ve.ui.MWGraphDialog, ve.ui.MWExtensionDialog );

/* Static properties */

ve.ui.MWGraphDialog.static.name = 'graph';

ve.ui.MWGraphDialog.static.title = OO.ui.deferMsg( 'graph-ve-dialog-edit-title' );

ve.ui.MWGraphDialog.static.icon = 'code';

ve.ui.MWGraphDialog.static.size = 'large';

ve.ui.MWGraphDialog.static.actions = [
	{
		action: 'done',
		label: OO.ui.deferMsg( 'graph-ve-dialog-edit-apply' ),
		flags: [ 'progressive', 'primary' ],
		modes: 'edit'
	},
	{
		action: 'done',
		label: OO.ui.deferMsg( 'visualeditor-dialog-action-insert' ),
		flags: [ 'constructive', 'primary' ],
		modes: 'insert'
	},
	{
		label: OO.ui.deferMsg( 'graph-ve-dialog-edit-cancel' ),
		flags: 'safe',
		modes: [ 'edit', 'insert' ]
	}
];

ve.ui.MWGraphDialog.static.modelClasses = [ ve.dm.MWGraphNode ];

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.MWGraphDialog.prototype.getBodyHeight = function () {
	// FIXME: This should depend on the dialog's content.
	return 500;
};

/**
 * @inheritdoc
 */
ve.ui.MWGraphDialog.prototype.initialize = function () {
	var graphTypeField, paddingAutoField, paddingFieldset,
		jsonTextField;

	// Parent method
	ve.ui.MWGraphDialog.super.prototype.initialize.call( this );

	/* Root layout */
	this.rootLayout = new OO.ui.BookletLayout( {
		classes: [ 've-ui-mwGraphDialog-panel-root' ],
		outlined: true
	} );

	this.generalPage = new OO.ui.PageLayout( 'general' );
	this.dataPage = new OO.ui.PageLayout( 'data' );
	this.rawPage = new OO.ui.PageLayout( 'raw' );

	this.rootLayout.addPages( [
		this.generalPage, this.dataPage, this.rawPage
	] );

	/* General page */
	this.generalPage.getOutlineItem()
		.setIcon( 'parameter' )
		.setLabel( ve.msg( 'graph-ve-dialog-edit-page-general' ) );

	this.graphTypeDropdownInput = new OO.ui.DropdownInputWidget();

	graphTypeField = new OO.ui.FieldLayout( this.graphTypeDropdownInput, {
		label: ve.msg( 'graph-ve-dialog-edit-field-graph-type' )
	} );

	this.unknownGraphTypeWarningLabel = new OO.ui.LabelWidget( {
		label: ve.msg( 'graph-ve-dialog-edit-unknown-graph-type-warning' )
	} );

	this.paddingAutoCheckbox = new OO.ui.CheckboxInputWidget( {
		value: 'paddingAuto'
	} );

	paddingAutoField = new OO.ui.FieldLayout( this.paddingAutoCheckbox, {
		label: ve.msg( 'graph-ve-dialog-edit-padding-auto' )
	} );

	this.paddingTable = new ve.ui.TableWidget( [ ve.msg( 'graph-ve-dialog-edit-padding-table-unit' ) ], {
		items: ( function ( rowData ) {
				var rows = [],
					row, i;

				for ( i = 0; i < rowData.length; i++ ) {
					row = new ve.ui.RowWidget( {
						key: rowData[ i ].key,
						label: rowData[ i ].label,
						deletable: false
					} );

					row.addItems( [
						new OO.ui.TextInputWidget( {
							data: 0,
							validate: /^[0-9]+$/
						} )
					] );

					rows.push( row );
				}

				return rows;
			}( [
				{
					key: 'top',
					label: ve.msg( 'graph-ve-dialog-edit-padding-table-top' )
				},
				{
					key: 'bottom',
					label: ve.msg( 'graph-ve-dialog-edit-padding-table-bottom' )
				},
				{
					key: 'left',
					label: ve.msg( 'graph-ve-dialog-edit-padding-table-left' )
				},
				{
					key: 'right',
					label: ve.msg( 'graph-ve-dialog-edit-padding-table-right' )
				}
			] ) ),
		disableInsertion: true,
		hideHeaders: true
	} );

	paddingFieldset = new OO.ui.FieldsetLayout( {
		label: ve.msg( 'graph-ve-dialog-edit-padding-fieldset' )
	} );

	paddingFieldset.addItems( [
		paddingAutoField,
		this.paddingTable
	] );

	this.generalPage.$element.append(
		graphTypeField.$element,
		this.unknownGraphTypeWarningLabel.$element,
		paddingFieldset.$element
	);

	/* Data page */
	this.dataPage.getOutlineItem()
		.setIcon( 'parameter' )
		.setLabel( ve.msg( 'graph-ve-dialog-edit-page-data' ) );

	/* Raw JSON page */
	this.rawPage.getOutlineItem()
		.setIcon( 'code' )
		.setLabel( ve.msg( 'graph-ve-dialog-edit-page-raw' ) );

	this.jsonTextInput = new ve.ui.MWAceEditorWidget( {
		autosize: true,
		classes: [ 've-ui-mwGraphDialog-json' ],
		maxRows: 22,
		multiline: true,
		validate: this.validateRawData
	} );

	// Make sure JSON is LTR
	this.jsonTextInput
		.setLanguage( 'json' )
		.toggleLineNumbers( false )
		.setRTL( false );

	jsonTextField = new OO.ui.FieldLayout( this.jsonTextInput, {
		label: ve.msg( 'graph-ve-dialog-edit-field-raw-json' ),
		align: 'top'
	} );

	this.rawPage.$element.append( jsonTextField.$element );

	// Events
	this.rootLayout.connect( this, { set: 'onRootLayoutSet' } );

	this.graphTypeDropdownInput.connect( this, { change: 'onGraphTypeInputChange' } );

	this.paddingAutoCheckbox.connect( this, { change: 'onPaddingAutoCheckboxChange' } );
	this.paddingTable.connect( this, {
		change: 'onPaddingTableChange'
	} );

	this.jsonTextInput.connect( this, { change: 'onSpecStringInputChange' } );

	// Initialization
	this.$body.append( this.rootLayout.$element );
};

/**
 * @inheritdoc
 */
ve.ui.MWGraphDialog.prototype.getSetupProcess = function ( data ) {
	return ve.ui.MWGraphDialog.super.prototype.getSetupProcess.call( this, data )
		.next( function () {
			var spec, newElement;

			this.getFragment().getSurface().pushStaging();

			// Create new graph node if not present (insert mode)
			if ( !this.selectedNode ) {
				this.setMode( 'insert' );

				newElement = this.getNewElement();
				this.fragment = this.getFragment().insertContent( [
					newElement,
					{ type: '/' + newElement.type }
				] );
				this.getFragment().select();
				this.selectedNode = this.getFragment().getSelectedNode();
			} else {
				this.setMode( 'edit' );
			}

			// Set up model
			spec = ve.copy( this.selectedNode.getSpec() );

			this.graphModel = new ve.dm.MWGraphModel( spec );
			this.graphModel.connect( this, {
				specChange: 'onSpecChange'
			} );

			// Set up default values
			this.setupFormValues();

			// If parsing fails here, cached raw data can simply remain null
			try {
				this.cachedRawData = JSON.parse( this.jsonTextInput.getValue() );
			} catch ( err ) {}

			this.checkChanges();
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWGraphDialog.prototype.getTeardownProcess = function ( data ) {
	return ve.ui.MWGraphDialog.super.prototype.getTeardownProcess.call( this, data )
		.first( function () {
			// Kill model
			this.graphModel.disconnect( this );

			this.graphModel = null;

			// Clear data page
			this.dataTable.clearItems();
			this.dataTable.disconnect( this );
			this.dataTable.$element.remove();

			this.dataTable = null;

			// Kill staging
			if ( data === undefined ) {
				this.getFragment().getSurface().popStaging();
			}
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWGraphDialog.prototype.getActionProcess = function ( action ) {
	switch ( action ) {
		case 'done':
			return new OO.ui.Process( function () {
				this.graphModel.applyChanges( this.selectedNode, this.getFragment().getSurface() );
				this.close( { action: action } );
			}, this );

		default:
			return ve.ui.MWGraphDialog.super.prototype.getActionProcess.call( this, action );
	}
};

/**
 * Setup initial values in the dialog
 *
 * @private
 */
ve.ui.MWGraphDialog.prototype.setupFormValues = function () {
	var padding,
		paddings = this.graphModel.getPaddingObject(),
		graphType = this.graphModel.getGraphType(),
		options = [
			{
				data: 'bar',
				label: ve.msg( 'graph-ve-dialog-edit-type-bar' )
			},
			{
				data: 'area',
				label: ve.msg( 'graph-ve-dialog-edit-type-area' )
			},
			{
				data: 'line',
				label: ve.msg( 'graph-ve-dialog-edit-type-line' )
			}
		],
		unknownGraphTypeOption = {
			data: 'unknown',
			label: ve.msg( 'graph-ve-dialog-edit-type-unknown' )
		};

	// Graph type
	if ( graphType === 'unknown' ) {
		options.push( unknownGraphTypeOption );
	}

	this.graphTypeDropdownInput
		.setOptions( options )
		.setValue( graphType );

	// Padding
	this.paddingAutoCheckbox.setSelected( this.graphModel.isPaddingAutomatic() );
	for ( padding in paddings ) {
		if ( paddings.hasOwnProperty( padding ) ) {
			this.paddingTable.setValue( padding, 0, paddings[ padding ] );
		}
	}

	// Data
	this.updateDataPage();

	// JSON text input
	this.jsonTextInput.setValue( this.graphModel.getSpecString() ).clearUndoStack();
};

/**
 * Update data page widgets based on the current spec
 */
ve.ui.MWGraphDialog.prototype.updateDataPage = function () {
	var pipeline = this.graphModel.getPipeline( 0 ),
		i, row, rows, inputs, entry, field;

	this.dataTable = new ve.ui.TableWidget(
		this.graphModel.getPipelineFields( 0 ),
		{
			hideRowLabels: true
		}
	);

	// Iterate over each data entry
	rows = [];
	for ( i = 0; i < pipeline.values.length; i++ ) {
		entry = pipeline.values[ i ];
		row = new ve.ui.RowWidget();
		inputs = [];

		for ( field in entry ) {
			if ( entry.hasOwnProperty( field ) ) {
				inputs.push( new OO.ui.TextInputWidget( {
					data: field,
					value: entry[ field ],
					validate: /^[0-9]+$/,
					inputFilter: this.dataTable.filterCellInput
				} ) );
			}
		}

		row.addItems( inputs );
		rows.push( row );
	}

	this.dataTable.addItems( rows );

	// Event listeners
	this.dataTable.connect( this, {
		change: 'onDataInputChange',
		deleteRow: 'onDataInputRowDelete'
	} );

	// Initialization
	this.dataPage.$element.append( this.dataTable.$element );
};

/**
 * Validate raw data input
 *
 * @private
 * @param {string} value The new input value
 */
ve.ui.MWGraphDialog.prototype.validateRawData = function ( value ) {
	var isValid = !$.isEmptyObject( ve.dm.MWGraphNode.static.parseSpecString( value ) ),
		label = ( isValid ) ? '' : ve.msg( 'graph-ve-dialog-edit-json-invalid' );

	this.setLabel( label );

	return isValid;
};

/**
 * Handle spec string input change
 *
 * @private
 * @param {string} value The text input value
 */
ve.ui.MWGraphDialog.prototype.onSpecStringInputChange = function ( value ) {
	var newRawData;

	try {
		// If parsing fails here, nothing more needs to happen
		newRawData = JSON.parse( value );

		// Only pass changes to model if there was anything worthwhile to change
		if ( !OO.compare( this.cachedRawData, newRawData ) ) {
			this.cachedRawData = newRawData;
			this.graphModel.setSpecFromString( value );
		}
	} catch ( err ) {}
};

/**
 * Handle graph type changes
 *
 * @param {string} value The new graph type
 */
ve.ui.MWGraphDialog.prototype.onGraphTypeInputChange = function ( value ) {
	this.unknownGraphTypeWarningLabel.toggle( value === 'unknown' );

	if ( value !== 'unknown' ) {
		this.graphModel.switchGraphType( value );
	}
};

/**
 * Handle data input changes
 *
 * @param {number} index The index of the entry updated
 * @param {string} key The key of the entry updated
 * @param {string} field The field that changed
 * @param {string} value The new value for the field
 */
ve.ui.MWGraphDialog.prototype.onDataInputChange = function ( index, key, field, value ) {
	if ( !isNaN( value ) ) {
		this.graphModel.setEntryField( index, field, parseFloat( value ) );
	}
};

/**
 * Handle data input row deletions
 *
 * @param {number} [rowIndex] The index of the row deleted
 */
ve.ui.MWGraphDialog.prototype.onDataInputRowDelete = function ( rowIndex ) {
	this.graphModel.removeEntry( rowIndex );
};

/**
 * Handle page set events on the root layout
 *
 * @param {OO.ui.PageLayout} page Set page
 */
ve.ui.MWGraphDialog.prototype.onRootLayoutSet = function ( page ) {
	if ( page.getName() === 'raw' ) {
		// The raw data may have been changed while not visible,
		// so recalculate height now it is visible.
		// HACK: Invalidate value cache
		this.jsonTextInput.valCache = null;
		this.jsonTextInput.adjustSize( true );
		this.setSize( 'larger' );
	} else {
		this.setSize( 'large' );
	}
};

/**
 * Handle auto padding mode changes
 *
 * @param {boolean} value New mode value
 */
ve.ui.MWGraphDialog.prototype.onPaddingAutoCheckboxChange = function ( value ) {
	this.graphModel.setPaddingAuto( value );
};

/**
 * Handle padding table data changes
 *
 * @param {number} index The index of the row that changed
 * @param {string} key The key of the row that changed
 * @param {string} field The field that changed
 * @param {string} value The new value
 */
ve.ui.MWGraphDialog.prototype.onPaddingTableChange = function ( index, key, field, value ) {
	this.graphModel.setPadding( key, parseInt( value ) );
};

/**
 * Handle model spec change events
 *
 * @private
 */
ve.ui.MWGraphDialog.prototype.onSpecChange = function () {
	var padding,
		paddingAuto = this.graphModel.isPaddingAutomatic(),
		paddingObj = this.graphModel.getPaddingObject();

	this.jsonTextInput.setValue( this.graphModel.getSpecString() );

	if ( paddingAuto ) {
		// Clear padding table if set to automatic
		this.paddingTable.clear();
	} else {
		// Fill padding table with model values if set to manual
		for ( padding in paddingObj ) {
			if ( paddingObj.hasOwnProperty( padding ) ) {
				this.paddingTable.setValue( padding, 0, paddingObj[ padding ] );
			}
		}
	}
	this.paddingTable.setDisabled( paddingAuto );

	this.checkChanges();
};

/**
 * Check for overall validity and enables/disables action abilities accordingly
 *
 * @private
 */
ve.ui.MWGraphDialog.prototype.checkChanges = function () {
	var self = this,
		hasModelBeenChanged = this.graphModel.hasBeenChanged(),
		areChangesValid;

	this.jsonTextInput.isValid().done( function ( isJsonTextInputValid ) {
		areChangesValid = self.mode === 'insert' ||
						( hasModelBeenChanged && isJsonTextInputValid );
		self.actions.setAbilities( { done: areChangesValid } );
	} );
};

/**
 * Sets and caches the mode of the dialog.
 *
 * @private
 * @param {string} mode The new mode, either `edit` or `insert`
 */
ve.ui.MWGraphDialog.prototype.setMode = function ( mode ) {
	this.actions.setMode( mode );
	this.mode = mode;
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWGraphDialog );
