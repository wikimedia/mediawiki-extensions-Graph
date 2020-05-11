<?php
/**
 * Graph extension Hooks
 *
 * @file
 * @ingroup Extensions
 */

namespace Graph;

use Parser;

class Hooks {

	/**
	 * ParserFirstCallInit hook handler.
	 * Registers the <graph> tag
	 *
	 * @param Parser $parser
	 * @return bool
	 */
	public static function onParserFirstCallInit( Parser $parser ) {
		$parser->setHook( 'graph', 'Graph\ParserTag::onGraphTag' );
		return true;
	}

	/**
	 * ParserAfterParse hook handler.
	 *
	 * @param Parser $parser
	 * @return bool
	 */
	public static function onParserAfterParse( Parser $parser ) {
		ParserTag::finalizeParserOutput( $parser, $parser->getTitle(), $parser->getOutput() );
		return true;
	}
}
