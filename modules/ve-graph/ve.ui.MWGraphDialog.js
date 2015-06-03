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
	this.cachedRawData = null;
	this.changingJsonTextInput = false;
};

/* Inheritance */

OO.inheritClass( ve.ui.MWGraphDialog, ve.ui.NodeDialog );

/* Static properties */

ve.ui.MWGraphDialog.static.name = 'graph';

ve.ui.MWGraphDialog.static.title = OO.ui.deferMsg( 'graph-ve-dialog-edit-title' );

ve.ui.MWGraphDialog.static.icon = 'code';

ve.ui.MWGraphDialog.static.size = 'large';

ve.ui.MWGraphDialog.static.actions = [
	{
		action: 'apply',
		label: OO.ui.deferMsg( 'graph-ve-dialog-edit-apply' ),
		flags: [ 'progressive', 'primary' ],
		modes: 'edit'
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
	var rootPanelLayout, jsonTextField;

	// Parent method
	ve.ui.MWGraphDialog.super.prototype.initialize.call( this );

	// Root layout
	rootPanelLayout = new OO.ui.PanelLayout( {
		padded: true
	} );

	// JSON spec field
	this.jsonTextInput = new ve.ui.WhitespacePreservingTextInputWidget( {
		autosize: true,
		classes: [ 've-ui-mwGraphDialog-json' ],
		maxRows: 25,
		multiline: true,
		validate: this.validateRawData
	} );

	jsonTextField = new OO.ui.FieldLayout( this.jsonTextInput, {
		label: ve.msg( 'graph-ve-dialog-edit-field-raw-json' ),
		align: 'top'
	} );

	// Event handlers
	this.jsonTextInput.connect( this, {
		change: 'onSpecStringInputChange'
	} );

	// Initialization
	rootPanelLayout.$element.append( jsonTextField.$element );

	this.$body.append( rootPanelLayout.$element );
};

/**
 * @inheritdoc
 */
ve.ui.MWGraphDialog.prototype.getSetupProcess = function ( data ) {
	var spec;

	return ve.ui.MWGraphDialog.super.prototype.getSetupProcess.call( this, data )
		.next( function () {
			// Set up model
			spec = this.selectedNode.getSpec();

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
ve.ui.MWGraphDialog.prototype.getTeardownProcess = function () {
	return ve.ui.MWGraphDialog.super.prototype.getTeardownProcess.call( this )
		.first( function () {
			// Kill model
			this.graphModel.disconnect( this );
			this.graphModel = null;
		}, this );
};

/**
 * @inheritdoc
 */
ve.ui.MWGraphDialog.prototype.getActionProcess = function ( action ) {
	switch ( action ) {
		case 'apply':
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
	this.jsonTextInput.setValue( this.graphModel.getSpecString() );
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
 * React to spec string input change
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
 * React to model spec changes
 *
 * @private
 */
ve.ui.MWGraphDialog.prototype.onSpecChange = function () {
	this.jsonTextInput.setValue( this.graphModel.getSpecString() );

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
		areChangesValid = ( hasModelBeenChanged && isJsonTextInputValid );
		self.actions.setAbilities( { apply: areChangesValid } );
	} );
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.MWGraphDialog );
