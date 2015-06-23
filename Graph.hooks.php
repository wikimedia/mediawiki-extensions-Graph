<?php
/**
 * Graph extension Hooks
 *
 * @file
 * @ingroup Extensions
 */

class GraphHooks {
	/**
	 * Conditionally register the ext.graph.VisualEditor module if VisualEditor
	 * has been loaded
	 *
	 * @param ResourceLoader $resourceLoader
	 * @return boolean true
	 */
	public static function onResourceLoaderRegisterModules( ResourceLoader &$resourceLoader ) {
		$resourceModules = $resourceLoader->getConfig()->get( 'ResourceModules' );

		$graphModuleTemplate = array(
			'localBasePath' => __DIR__,
			'remoteExtPath' => 'Graph'
		);

		$addModules = array(
			'ext.graph.visualEditor' => $graphModuleTemplate + array(
				'scripts' => array(
					'modules/ve-graph/ve.dm.MWGraphNode.js',
					'modules/ve-graph/ve.ce.MWGraphNode.js'
				),
				'dependencies' => array(
					'ext.visualEditor.mwcore',
					'ext.graph'
				),
				'messages' => array(
					'graph-ve-no-spec'
				),
				'targets' => array(
					'mobile', 'desktop'
				)
			)
		);

		if ( isset( $resourceModules[ 'ext.visualEditor.mwcore' ] ) || $resourceLoader->isModuleRegistered( 'ext.visualEditor.mwcore' ) ) {
			$resourceLoader->register( $addModules );
		}

		return true;
	}
}
