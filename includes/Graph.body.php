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
use ObjectCache;
use Parser;
use ParserOptions;
use ParserOutput;
use PPFrame;
use Title;

class Singleton {

	/**
	 * @param $input
	 * @param array $args
	 * @param Parser $parser
	 * @param PPFrame $frame
	 * @return string
	 */
	public static function onGraphTag( $input, array $args, Parser $parser, PPFrame $frame ) {
		return Singleton::buildHtml( $input, $parser->getTitle(), $parser->getRevisionId(),
			$parser->getOutput(), $parser->getOptions()->getIsPreview(), $args );
	}

	public static function finalizeParserOutput( Parser $parser, $title, ParserOutput $output ) {
		if ( $output->getExtensionData( 'graph_specs_broken' ) ) {
			$output->addTrackingCategory( 'graph-broken-category', $title );
		}
		if ( $output->getExtensionData( 'graph_specs_obsolete' ) ) {
			$output->addTrackingCategory( 'graph-obsolete-category', $title );
		}
		$specs = $output->getExtensionData( 'graph_specs' );
		if ( $specs !== null ) {
			// Store all graph specs as gzip-ed blob in page properties
			$ppValue = gzencode( FormatJson::encode( $specs, false, FormatJson::ALL_OK ), 9 );
			$output->setProperty( 'graph_specs', $ppValue );
			$output->addTrackingCategory( 'graph-tracking-category', $title );

			// We can only load one version of vega lib - either 1 or 2
			// If the default version is 1, and if any of the graphs need Vega2,
			// we treat all graphs as Vega2 and load corresponding libraries.
			// All this should go away once we drop Vega1 support.

			$liveSpecs = $output->getExtensionData( 'graph_live_specs' );
			$interact = $output->getExtensionData( 'graph_interact' );

			if ( $parser->getOptions()->getIsPreview() ) {
				// Preview generates HTML that is different from normal
				$parser->disableCache();
			}

			if ( $liveSpecs || $interact ) {
				$output->addModuleStyles( 'ext.graph.styles' );
				if ( $liveSpecs ) {
					// Module: ext.graph.vega1, ext.graph.vega2
					$output->addModules( 'ext.graph.vega' .
						( $output->getExtensionData( 'graph_vega2' ) ? 2 : 1 ) );
					$output->addJsConfigVars( 'wgGraphSpecs', $liveSpecs );
				} else {
					$output->addModules( 'ext.graph.loader' );
				}
			}
		}
	}

	/**
	 * @param string $mode
	 * @param mixed $data
	 * @param string $hash
	 * @return array
	 */
	public static function buildDivAttributes( $mode = '', $data = false, $hash = '' ) {
		$attribs = array( 'class' => 'mw-graph' );

		if ( is_object( $data ) ) {
			$width = property_exists( $data, 'width' ) && is_int( $data->width ) ? $data->width : 0;
			$height =
				property_exists( $data, 'height' ) && is_int( $data->height ) ? $data->height : 0;
			if ( $width && $height ) {
				$attribs['style'] = "min-width:{$width}px;min-height:{$height}px";
			}
		}
		if ( $mode ) {
			$attribs['class'] .= ' mw-graph-' . $mode;
		}
		if ( $hash ) {
			$attribs['data-graph-id'] = $hash;
		}

		return $attribs;
	}

	/**
	 * @param string $jsonText
	 * @param Title $title
	 * @param int $revid
	 * @param ParserOutput $parserOutput
	 * @param bool $isPreview
	 * @param array $args
	 * @return string
	 */
	public static function buildHtml( $jsonText, $title, $revid, $parserOutput, $isPreview,
									  $args = null ) {
		global $wgGraphImgServiceUrl, $wgServerName;

		$status = FormatJson::parse( $jsonText, FormatJson::TRY_FIXING | FormatJson::STRIP_COMMENTS );
		if ( !$status->isOK() ) {
			$parserOutput->setExtensionData( 'graph_specs_broken', true );
			return "<span class=\"error\">{$status->getWikiText()}</span>";
		}

		$isInteractive = isset( $args['mode'] ) && $args['mode'] === 'interactive';
		$graphTitle = isset( $args['title'] ) ? $args['title'] : '';
		$data = $status->getValue();
		if ( !is_object( $data ) ) {
			// @todo: Output an error message instead?
			$data = (object)[ 'width' => 200, 'height' => 200 ];
		}

		// Figure out which vega version to use
		global $wgGraphDefaultVegaVer;
		if ( property_exists( $data, 'version' ) && is_numeric( $data->version ) ) {
			$data->version = $data->version < 2 ? 1 : 2;
		} else {
			$data->version = $wgGraphDefaultVegaVer;
		}
		if ( $data->version === 2 ) {
			$parserOutput->setExtensionData( 'graph_vega2', true );
		} else {
			$parserOutput->setExtensionData( 'graph_specs_obsolete', true );
		}

		// Calculate hash and store graph definition in graph_specs extension data
		$specs = $parserOutput->getExtensionData( 'graph_specs' ) ?: array();
		// Make sure that multiple json blobs that only differ in spacing hash the same
		$hash = sha1( FormatJson::encode( $data, false, FormatJson::ALL_OK ) );
		$specs[$hash] = $data;
		$parserOutput->setExtensionData( 'graph_specs', $specs );

		self::saveDataToCache( $hash, $data );

		if ( $isPreview || !$wgGraphImgServiceUrl ) {
			// Always do client-side rendering
			$attribs = self::buildDivAttributes( 'always', $data, $hash );
			$liveSpecs = $parserOutput->getExtensionData( 'graph_live_specs' ) ?: array();
			$liveSpecs[$hash] = $data;
			$parserOutput->setExtensionData( 'graph_live_specs', $liveSpecs );
			$html = ''; // will be injected with a <canvas> tag
		} else {

			// Image from Graphoid
			$server = rawurlencode( $wgServerName );
			$title = !$title ? '' : rawurlencode( $title->getPrefixedDBkey() );
			$revid = rawurlencode( (string)$revid ) ?: '0';
			$url = sprintf( $wgGraphImgServiceUrl, $server, $title, $revid, $hash );
			$imgAttrs = array(
				'class' => 'mw-graph-img',
				'src' => $url,
			);
			if ( $graphTitle ) {
				// only add alt tag if we have some descriptive text
				$imgAttrs['alt'] = $graphTitle;
			}
			$html = Html::rawElement( 'img', $imgAttrs );

			if ( $isInteractive ) {
				// Allow image to interactive switchover
				$parserOutput->setExtensionData( 'graph_interact', true );
				$attribs = self::buildDivAttributes( 'interactable', $data, $hash );

				// add the overlay title
				if ( $graphTitle ) {
					$hoverTitle = Html::element( 'div', array( 'class' => 'mw-graph-hover-title' ),
						$graphTitle );
				} else {
					$hoverTitle = '';
				}

				// Add a "make interactive" button
				$button = Html::rawElement( 'div', array( 'class' => 'mw-graph-switch' ),
					Html::rawElement( 'i', array( 'class' => 'icon-play' ), '&#9658;' ) );

				$html .= Html::rawElement( 'div', array(
					'class' => 'mw-graph-layover',
				), $hoverTitle . $button );
			} else {
				$attribs = self::buildDivAttributes( '', $data );
			}
		}

		return Html::rawElement( 'div', $attribs, $html );
	}

	/**
	 * Store graph data in the memcached
	 * @param $hash string
	 * @param $data string Graph spec after json encoding
	 */
	private static function saveDataToCache( $hash, $data ) {
		$cache = ObjectCache::getLocalClusterInstance();
		$cache->add( $cache->makeKey( 'graph-data', $hash ), $data );
	}

	/**
	 * Get graph data from the memcached
	 * @param $hash
	 * @return mixed
	 */
	public static function getDataFromCache( $hash ) {
		$cache = ObjectCache::getLocalClusterInstance();
		return $cache->get( $cache->makeKey( 'graph-data', $hash ) );
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
		/** @var $wgParser Parser */
		global $wgParser;
		$text = $this->getNativeData();
		$parser = $wgParser->getFreshParser();
		$text = $parser->preprocess( $text, $title, $options, $revId );

		$html = !$generateHtml ? '' : Singleton::buildHtml( $text, $title, $revId, $output,
			$options->getIsPreview() );
		$output->setText( $html );

		// Since we invoke parser manually, the ParserAfterParse never gets called, do it manually
		Singleton::finalizeParserOutput( $parser, $title, $output );
	}
}
