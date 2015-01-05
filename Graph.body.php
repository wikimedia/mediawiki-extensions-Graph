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
		global $wgEnableGraphParserTag;
		if ( $wgEnableGraphParserTag ) {
			$parser->setHook( 'graph', 'Graph\Singleton::onGraphTag' );
		}
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
		self::updateParserOutput( $parser->getOutput() );
		return self::buildHtml( $input, $parser->getTitle(), $parser->getRevisionId() );
	}

	public static function updateParserOutput( ParserOutput $parserOutput ) {
		global $wgGraphDataDomains;
		$parserOutput->addJsConfigVars( 'wgGraphDataDomains', $wgGraphDataDomains );
		$parserOutput->addModules( 'ext.graph' );
		return $parserOutput;
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
	 * @return string
	 */
	public static function buildHtml( $jsonText, $title, $revid ) {

		global $wgGraphImgServiceUrl;
		static $hashIds = array();

		$status = FormatJson::parse( $jsonText, FormatJson::TRY_FIXING | FormatJson::STRIP_COMMENTS );
		if ( !$status->isGood() ) {
			return $status->getWikiText();
		}

		$json = FormatJson::encode( $status->getValue(), false, FormatJson::ALL_OK );

		$spanAttrs = array(
			'class' => 'mw-wiki-graph',
			'data-spec' => $json,
		);

		// ensure that the same ID is not used multiple times,
		// e.g. identical graph is included multiple times
		$id = 'mw-graph-' . sha1( $json );
		if ( array_key_exists( $id, $hashIds ) ) {
			$hashIds[$id] += 1;
			$id = $id . '-' . $hashIds[$id];
		} else {
			$hashIds[$id] = 1;
		}
		$spanAttrs['id'] = $id;

		if ( $wgGraphImgServiceUrl ) {
			$title = !$title ? '' : rawurlencode( str_replace( $title->getText(), ' ', '_' ) );
			$revid = rawurlencode( (string)$revid ) ?: '0';
			$url = sprintf( $wgGraphImgServiceUrl, $title, $revid, $id );

			// TODO: Use "width" and "height" from the definition if available
			// In some cases image might still be larger - need to investigate
			$img = Html::rawElement( 'img', array( 'src' => $url ) );

			$backendImgLinks =
				Html::inlineScript( 'if(!mw.window){document.write(' .
									FormatJson::encode( $img, false, FormatJson::UTF8_OK ) .
									');}' ) .
				Html::rawElement( 'noscript', array(), $img );
		} else {
			$backendImgLinks = '';
		}

		return Html::element( 'span', $spanAttrs ) . $backendImgLinks;
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
		//
		// TODO: Somehow we need to avoid wgParser here
		global $wgParser;
		Singleton::updateParserOutput( $wgParser->getOutput() );
		return Singleton::buildHtml(
			$this->getNativeData(),
			$wgParser->getTitle(),
			$wgParser->getRevisionId() );
	}

	protected function fillParserOutput( Title $title, $revId, ParserOptions $options, $generateHtml,
	                                     ParserOutput &$output ) {
		global $wgParser;
		$text = $this->getNativeData();
		$parser = $wgParser->getFreshParser();
//		$output = $parser->parse( $text, $title, $options, true, true, $revId );
		$text = $parser->preprocess( $text, $title, $options, $revId );

		Singleton::updateParserOutput( $output );
		$output->setText( $generateHtml ? Singleton::buildHtml( $text, $title, $revId ) : '' );
	}

	public function getCompactJson() {
		return FormatJson::encode( $this->getData(), false, FormatJson::ALL_OK );
	}
}
