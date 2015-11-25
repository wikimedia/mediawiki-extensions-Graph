<?php
/**
 *
 * @license MIT
 * @file
 *
 * @author Dan Andreescu, Yuri Astrakhan, Frédéric Bolduc
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
		self::finalizeParserOutput( $parser->getOutput(), $parser->getTitle(),
			$parser->getOptions()->getIsPreview() );
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
			$parser->getOutput(), $parser->getOptions()->getIsPreview() );
	}

	public static function finalizeParserOutput( ParserOutput $output, $title, $isPreview ) {
		if ( $output->getExtensionData( 'graph_specs_broken' ) ) {
			$output->addTrackingCategory( 'graph-broken-category', $title );
		}
		$specs = $output->getExtensionData( 'graph_specs' );
		if ( $specs !== null ) {
			global $wgGraphImgServiceAlways, $wgGraphImgServiceUrl;
			if ( $isPreview || !$wgGraphImgServiceUrl || !$wgGraphImgServiceAlways ) {
				// We can only load one version of vega lib - either 1 or 2
				// If the default version is 1, and if any of the graphs need Vega2,
				// we treat all graphs as Vega2 and load corresponding libraries.
				// All this should go away once we drop Vega1 support.
				global $wgGraphDefaultVegaVer;
				$vegaVer = $wgGraphDefaultVegaVer;
				if ( $vegaVer === 1 ) {
					foreach ( $specs as $spec ) {
						if ( property_exists( $spec, 'version' ) ) {
							$ver = $spec->version;
							if ( is_numeric( $ver ) && $ver > 1 ) {
								$vegaVer = 2;
								break;
							}
						}
					}
				}

				$output->addModules( 'ext.graph.vega' . $vegaVer );
				$output->addJsConfigVars( 'wgGraphSpecs', $specs );

				// TODO: these 3 js vars should be per domain if 'ext.graph' is added, not per page
				global $wgGraphDataDomains, $wgGraphUrlBlacklist, $wgGraphIsTrusted;
				$output->addJsConfigVars( 'wgGraphDataDomains', $wgGraphDataDomains );
				$output->addJsConfigVars( 'wgGraphUrlBlacklist', $wgGraphUrlBlacklist );
				$output->addJsConfigVars( 'wgGraphIsTrusted', $wgGraphIsTrusted );
			}
			$output->setProperty( 'graph_specs',
				FormatJson::encode( $specs, false, FormatJson::ALL_OK ) );
			$output->addTrackingCategory( 'graph-tracking-category', $title );
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
	 * @param bool $isPreview
	 * @return string
	 */
	public static function buildHtml( $jsonText, $title, $revid, $parserOutput, $isPreview ) {
		global $wgGraphImgServiceUrl, $wgServerName, $wgGraphImgServiceAlways;

		$status = FormatJson::parse( $jsonText, FormatJson::TRY_FIXING | FormatJson::STRIP_COMMENTS );
		if ( !$status->isOK() ) {
			$parserOutput->setExtensionData( 'graph_specs_broken', true );
			return $status->getWikiText();
		}

		// Calculate hash and store graph definition in graph_specs extension data
		$specs = $parserOutput->getExtensionData( 'graph_specs' ) ?: array();
		$data = $status->getValue();
		// Make sure that multiple json blobs that only differ in spacing hash the same
		$hash = sha1( FormatJson::encode( $data, false, FormatJson::ALL_OK ) );
		$specs[$hash] = $data;
		$parserOutput->setExtensionData( 'graph_specs', $specs );

		$html = '';

		// Graphoid service image URL
		if ( $wgGraphImgServiceUrl ) {
			$server = rawurlencode( $wgServerName );
			$title = !$title ? '' : rawurlencode( $title->getPrefixedDBkey() );
			$revid = rawurlencode( (string)$revid ) ?: '0';
			$url = sprintf( $wgGraphImgServiceUrl, $server, $title, $revid, $hash );

			// TODO: Use "width" and "height" from the definition if available
			// In some cases image might still be larger - need to investigate
			$html .= Html::rawElement( 'img', array(
				'class' => 'mw-wiki-graph-img',
				'src' => $url,
			) );
		}

		if ( $isPreview || !$wgGraphImgServiceUrl || !$wgGraphImgServiceAlways ) {
			$html .= Html::element( 'div', array(
				'class' => 'mw-wiki-graph',
				'data-graph-id' => $hash,
			) );
		}

		return Html::rawElement( 'div', array(
			'class' => 'mw-wiki-graph-container',
		), $html );
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

		$html = !$generateHtml ? '' : Singleton::buildHtml( $text, $title, $revId, $output,
			$options->getIsPreview() );
		$output->setText( $html );

		// Since we invoke parser manually, the ParserAfterParse never gets called, do it manually
		Singleton::finalizeParserOutput( $output, $title, $options->getIsPreview() );
	}
}
