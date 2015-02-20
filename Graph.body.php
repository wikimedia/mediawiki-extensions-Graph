<?php
/**
 *
 * @license MIT
 * @file
 *
 * @author Dan Andreescu, Yuri Astrakhan
 */

namespace Graph;

use FormatJson;
use Html;
use JsonConfig\JCContent;
use JsonConfig\JCSingleton;
use Parser;
use ParserOptions;
use ParserOutput;
use Title;

class Singleton {

	public static function onParserFirstCallInit( Parser $parser ) {
		$parser->setHook( 'graph', 'Graph\Singleton::onGraphTag' );
		return true;
	}

	public static function onParserAfterParse( Parser $parser ) {
		self::finalizeParserOutput( $parser->getOutput() );
		return true;
	}

	/**
	 * @param $input
	 * @param array $args
	 * @param Parser $parser
	 * @param \PPFrame $frame
	 * @return string
	 */
	public static function onGraphTag( $input, /** @noinspection PhpUnusedParameterInspection */
	                                   array $args, Parser $parser, \PPFrame $frame ) {
		// expand template arguments and other wiki markup
		$input = $parser->recursivePreprocess( $input, $frame );
		return self::buildHtml( $input, $parser->getTitle(), $parser->getRevisionId(),
			$parser->getOutput() );
	}

	public static function finalizeParserOutput( ParserOutput $output ) {
		$specs = $output->getExtensionData( 'graph_specs' );
		if ( $specs !== null ) {
			global $wgGraphDataDomains;
			$output->addJsConfigVars( 'wgGraphDataDomains', $wgGraphDataDomains );
			$output->addModules( 'ext.graph' );

			$output->addJsConfigVars( 'wgGraphSpecs', $specs );
			$output->setProperty( 'graph_specs',
				FormatJson::encode( $specs, false, FormatJson::ALL_OK ) );
		}
	}

	/**
	 * @param \EditPage $editpage
	 * @param \OutputPage $output
	 * @return bool
	 */
	public static function editPageShowEditFormInitial( &$editpage, $output ) {
		// TODO: not sure if this is the best way to test
		if ( $editpage->contentFormat === CONTENT_FORMAT_JSON &&
		     JCSingleton::getContentClass( $editpage->contentModel ) === __NAMESPACE__ . '\Content'
		) {
			$output->addModules( 'ext.graph.editor' );
		}
		return true;
	}

	/**
	 * @param string $jsonText
	 * @param Title $title
	 * @param int $revid
	 * @param ParserOutput $parserOutput
	 * @return string
	 */
	public static function buildHtml( $jsonText, $title, $revid, $parserOutput ) {
		global $wgGraphImgServiceUrl, $wgServerName;

		$status = FormatJson::parse( $jsonText, FormatJson::TRY_FIXING | FormatJson::STRIP_COMMENTS );
		if ( !$status->isGood() ) {
			return $status->getWikiText();
		}

		// Make sure that multiple json blobs that only differ in spacing hash the same
		$data = $status->getValue();
		$hash = sha1( FormatJson::encode( $data, false, FormatJson::ALL_OK ) );

		// Render fallback image rendering html (noscript and old-script)
		if ( $wgGraphImgServiceUrl ) {
			$server = rawurlencode( $wgServerName );
			$title = !$title ? '' : rawurlencode( str_replace( ' ', '_', $title->getText() ) );
			$revid = rawurlencode( (string)$revid ) ?: '0';
			$url = sprintf( $wgGraphImgServiceUrl, $server, $title, $revid, $hash );

			// TODO: Use "width" and "height" from the definition if available
			// In some cases image might still be larger - need to investigate
			$img = Html::rawElement( 'img', array( 'src' => $url ) );

			$backendImgLinks =
				Html::inlineScript( 'if(!window.mw){document.write(' .
									FormatJson::encode( $img, false, FormatJson::UTF8_OK ) .
									');}' ) .
				Html::rawElement( 'noscript', array(), $img );
		} else {
			$backendImgLinks = '';
		}

		$specs = $parserOutput->getExtensionData( 'graph_specs' ) ?: array();
		$specs[$hash] = $data;
		$parserOutput->setExtensionData( 'graph_specs', $specs );

		return Html::element( 'div', array(
			'class' => 'mw-wiki-graph',
			'data-graph-id' => $hash,
		) ) . $backendImgLinks;
	}
}

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
class Content extends JCContent {

	public function getWikitextForTransclusion() {
		return '<graph>' . $this->getNativeData() . '</graph>';
	}

	protected function fillParserOutput( Title $title, $revId, ParserOptions $options, $generateHtml,
	                                     ParserOutput &$output ) {
		global $wgParser;
		$text = $this->getNativeData();
		$parser = $wgParser->getFreshParser();
		$text = $parser->preprocess( $text, $title, $options, $revId );

		$html = $generateHtml ? Singleton::buildHtml( $text, $title, $revId, $output ) : '';
		$output->setText( $html );

		// Since we invoke parser manually, the ParserAfterParse never gets called, do it manually
		Singleton::finalizeParserOutput( $output );
	}
}
