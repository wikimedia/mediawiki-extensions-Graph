<?php
/**
 *
 * @license MIT
 * @file
 *
 * @author Dan Andreescu, Yuri Astrakhan, Frédéric Bolduc
 */

namespace Graph;

use JsonConfig\JCContent;
use Parser;
use ParserOptions;
use ParserOutput;
use Title;

/**
 * Class Content represents JSON content that Graph understands
 * as the definition of a visualization.
 *
 * This is based on TextContent, and represents JSON as a string.
 *
 * TODO: determine if a different representation makes more sense and implement it with
 * ContentHandler::serializeContent() and ContentHandler::unserializeContent()
 *
 * TODO: create a visual editor for Graph definitions that introspects what is allowed
 * in each part of the definition and presents documentation to aid with discovery.
 *
 */
class Content extends JCContent  {

	public function getWikitextForTransclusion() {
		return '<graph>' . $this->getNativeData() . '</graph>';
	}

	protected function fillParserOutput( Title $title, $revId, ParserOptions $options, $generateHtml,
										 ParserOutput &$output ) {
		/** @var $wgParser Parser */
		global $wgParser;
		$text = $this->getNativeData();
		$parser = $wgParser->getFreshParser();
		$text = $parser->preprocess( $text, $title, $options, $revId );

		$html = !$generateHtml ? '' : Singleton::buildHtml( $text, $title, $revId, $output,
			$options->getIsPreview() );
		$output->setText( $html );

		// Since we invoke parser manually, the ParserAfterParse never gets called, do it manually
		ParserTag::finalizeParserOutput( $parser, $title, $output );
	}
}
