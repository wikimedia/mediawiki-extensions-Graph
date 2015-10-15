/**
 * MediaWiki UserInterface graph tool.
 *
 * @class
 * @extends ve.ui.DialogTool
 * @constructor
 * @param {OO.ui.ToolGroup} toolGroup
 * @param {Object} [config] Configuration options
 */
ve.ui.MWGraphDialogTool = function VeUiMWGraphDialogTool( toolGroup, config ) {
	ve.ui.DialogTool.call( this, toolGroup, config );
};

/* Inheritance */

OO.inheritClass( ve.ui.MWGraphDialogTool, ve.ui.DialogTool );

/* Static properties */

ve.ui.MWGraphDialogTool.static.name = 'graph';
ve.ui.MWGraphDialogTool.static.group = 'object';
ve.ui.MWGraphDialogTool.static.icon = 'graph';
ve.ui.MWGraphDialogTool.static.title =
	OO.ui.deferMsg( 'graph-ve-dialog-button-tooltip' );
ve.ui.MWGraphDialogTool.static.modelClasses = [ ve.dm.MWGraphNode ];
ve.ui.MWGraphDialogTool.static.commandName = 'graph';

/* Registration */

ve.ui.toolFactory.register( ve.ui.MWGraphDialogTool );

/* Commands */

ve.ui.commandRegistry.register(
	new ve.ui.Command(
		'graph', 'window', 'open',
		{ args: [ 'graph' ], supportedSelections: [ 'linear' ] }
	)
);
