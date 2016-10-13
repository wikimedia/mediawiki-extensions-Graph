<?php
/**
 * Graph extension Hooks
 *
 * @file
 * @ingroup Extensions
 */

namespace Graph;

use Parser;
use ResourceLoader;

class Hooks {
	/**
	 * ResourceLoaderTestModules hook handler.
	 * Conditionally registers the unit testing module for the ext.graph.visualEditor module
	 * only if that module is loaded
	 *
	 * @param array $testModules The array of registered test modules
	 * @param ResourceLoader $resourceLoader The reference to the resource loader
	 * @return bool
	 */
	public static function onResourceLoaderTestModules( array &$testModules, ResourceLoader &$resourceLoader ) {
		$resourceModules = $resourceLoader->getConfig()->get( 'ResourceModules' );

		if (
			isset( $resourceModules[ 'ext.visualEditor.mediawiki' ] ) ||
			$resourceLoader->isModuleRegistered( 'ext.visualEditor.mediawiki' )
		) {
			$testModules['qunit']['ext.graph.visualEditor.test'] = array(
				'scripts' => array(
					'modules/ve-graph/tests/ext.graph.visualEditor.test.js'
				),
				'dependencies' => array(
					'ext.graph.visualEditor',
					'ext.graph.vega1',
					'ext.visualEditor.test'
				),
				'localBasePath' => dirname( __DIR__ ),
				'remoteExtPath' => 'Graph'
			);
		}

		return true;
	}

	/**
	 * ParserFirstCallInit hook handler.
	 * Registers the <graph> tag
	 *
	 * @param Parser $parser
	 * @return bool
	 */
	public static function onParserFirstCallInit( Parser $parser ) {
		$parser->setHook( 'graph', 'Graph\Singleton::onGraphTag' );
		return true;
	}

	/**
	 * ParserAfterParse hook handler.
	 *
	 * @param Parser $parser
	 * @return bool
	 */
	public static function onParserAfterParse( Parser $parser ) {
		Singleton::finalizeParserOutput( $parser, $parser->getTitle(), $parser->getOutput() );
		return true;
	}
}
