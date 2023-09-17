<?php
/**
 * Graph extension Hooks
 *
 * @file
 * @ingroup Extensions
 */

namespace Graph;

use MediaWiki\Hook\OutputPageParserOutputHook;
use MediaWiki\Hook\ParserFirstCallInitHook;
use OutputPage;
use Parser;
use ParserOutput;

class Hooks implements
	ParserFirstCallInitHook,
	OutputPageParserOutputHook
{

	/**
	 * ParserFirstCallInit hook handler.
	 * Registers the <graph> tag
	 *
	 * @param Parser $parser
	 */
	public function onParserFirstCallInit( $parser ) {
		$parser->setHook( 'graph', 'Graph\ParserTag::onGraphTag' );
	}

	/**
	 * OutputPageParserOutput hook handler
	 * @param OutputPage $outputPage
	 * @param ParserOutput $parserOutput ParserOutput instance being added in $outputPage
	 */
	public function onOutputPageParserOutput(
		$outputPage, $parserOutput
	): void {
		ParserTag::finalizeParserOutput( $outputPage, $parserOutput );
	}
}
