<?php
/**
 * Graph extension Hooks
 *
 * @file
 * @ingroup Extensions
 */

namespace Graph;

use OutputPage;
use Parser;
use ParserOutput;

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
	 * OutputPageParserOutput hook handler
	 * @param OutputPage $outputPage
	 * @param ParserOutput $parserOutput ParserOutput instance being added in $outputPage
	 */
	public static function onOutputPageParserOutput(
		OutputPage $outputPage, ParserOutput $parserOutput
	): void {
		ParserTag::finalizeParserOutput( $outputPage, $parserOutput );
	}
}
