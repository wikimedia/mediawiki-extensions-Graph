<?php
/**
 *
 * @license MIT
 * @file
 *
 * @author Dan Andreescu, Yuri Astrakhan, Frédéric Bolduc, Joseph Seddon
 */

namespace Graph;

use FormatJson;
use Html;
use Language;
use Linker;
use MediaWiki\MediaWikiServices;
use Message;
use Parser;
use ParserOptions;
use ParserOutput;
use PPFrame;
use Status;
use Title;

class ParserTag {
	/** @var ParserOptions */
	private $parserOptions;

	/** @var ParserOutput */
	private $parserOutput;

	/** @var Language */
	private $language;

	/**
	 * @param Parser $parser
	 * @param ParserOptions $parserOptions
	 * @param ParserOutput $parserOutput
	 */
	public function __construct( Parser $parser, ParserOptions $parserOptions,
		ParserOutput $parserOutput
	) {
		$this->parserOptions = $parserOptions;
		$this->parserOutput = $parserOutput;
		$this->language = $parser->getTargetLanguage();
	}

	/**
	 * @param string $input
	 * @param array $args
	 * @param Parser $parser
	 * @param PPFrame $frame
	 * @return string
	 */
	public static function onGraphTag( $input, array $args, Parser $parser, PPFrame $frame ) {
		$tag = new self( $parser, $parser->getOptions(), $parser->getOutput() );
		return $tag->buildHtml( $input, $parser->getTitle(), $parser->getRevisionId(), $args );
	}

	/**
	 * @param Parser $parser
	 * @param Title $title
	 * @param ParserOutput $parserOutput
	 */
	public static function finalizeParserOutput( Parser $parser, $title, ParserOutput $parserOutput ) {
		if ( $parserOutput->getExtensionData( 'graph_specs_broken' ) ) {
			$parser->addTrackingCategory( 'graph-broken-category' );
		}
		if ( $parserOutput->getExtensionData( 'graph_specs_obsolete' ) ) {
			$parser->addTrackingCategory( 'graph-obsolete-category' );
		}
		$specs = $parserOutput->getExtensionData( 'graph_specs' );
		if ( $specs !== null ) {
			$parser->addTrackingCategory( 'graph-tracking-category' );

			// We can only load one version of vega lib - either 1 or 2
			// If the default version is 1, and if any of the graphs need Vega2,
			// we treat all graphs as Vega2 and load corresponding libraries.
			// All this should go away once we drop Vega1 support.

			$liveSpecs = $parserOutput->getExtensionData( 'graph_live_specs' );
			$interact = $parserOutput->getExtensionData( 'graph_interact' );

			if ( $parser->getOptions()->getIsPreview() ) {
				// Preview generates HTML that is different from normal
				$parserOutput->updateCacheExpiry( 0 );
			}

			if ( $liveSpecs || $interact ) {
				$parserOutput->addModuleStyles( [ 'ext.graph.styles' ] );
				if ( $liveSpecs ) {
					// Module: ext.graph.vega1, ext.graph.vega2
					$parserOutput->addModules( [ 'ext.graph.vega' .
						( $parserOutput->getExtensionData( 'graph_vega2' ) ? 2 : 1 ) ] );
					$parserOutput->addJsConfigVars( 'wgGraphSpecs', $liveSpecs );
				} else {
					$parserOutput->addModules( [ 'ext.graph.loader' ] );
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
		$attribs = [ 'class' => 'mw-graph' ];

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
	 * @param Message $msg
	 * @return string
	 */
	private function formatError( Message $msg ) {
		$this->parserOutput->setExtensionData( 'graph_specs_broken', true );
		$error = $msg->inLanguage( $this->language )->parse();
		return "<span class=\"error\">{$error}</span>";
	}

	/**
	 * @param Status $status
	 * @return string
	 */
	private function formatStatus( Status $status ) {
		return $this->formatError( $status->getMessage( false, false, $this->language ) );
	}

	/**
	 * @param string $jsonText
	 * @param Title $title
	 * @param int $revid
	 * @param array|null $args
	 * @return string
	 */
	public function buildHtml( $jsonText, Title $title, $revid, $args = null ) {
		global $wgGraphImgServiceUrl, $wgServerName;

		$jsonText = trim( $jsonText );
		if ( $jsonText === '' ) {
			return $this->formatError( wfMessage( 'graph-error-empty-json' ) );
		}
		$status = FormatJson::parse( $jsonText, FormatJson::TRY_FIXING | FormatJson::STRIP_COMMENTS );
		if ( !$status->isOK() ) {
			return $this->formatStatus( $status );
		}

		$isInteractive = isset( $args['mode'] ) && $args['mode'] === 'interactive';
		$graphTitle = $args['title'] ?? '';
		$data = $status->getValue();
		if ( !is_object( $data ) ) {
			return $this->formatError( wfMessage( 'graph-error-not-vega' ) );
		}

		// Figure out which vega version to use
		global $wgGraphDefaultVegaVer;
		if ( property_exists( $data, 'version' ) && is_numeric( $data->version ) ) {
			$data->version = $data->version < 2 ? 1 : 2;
		} else {
			$data->version = $wgGraphDefaultVegaVer;
		}
		if ( $data->version === 2 ) {
			$this->parserOutput->setExtensionData( 'graph_vega2', true );
		} else {
			$this->parserOutput->setExtensionData( 'graph_specs_obsolete', true );
		}

		// Calculate hash and store graph definition in graph_specs extension data
		$specs = $this->parserOutput->getExtensionData( 'graph_specs' ) ?: [];
		// Make sure that multiple json blobs that only differ in spacing hash the same
		$hash = sha1( FormatJson::encode( $data, false, FormatJson::ALL_OK ) );
		$specs[$hash] = $data;
		$this->parserOutput->setExtensionData( 'graph_specs', $specs );

		if ( $this->parserOptions->getIsPreview() || !$wgGraphImgServiceUrl ) {
			// Always do client-side rendering
			$attribs = self::buildDivAttributes( 'always', $data, $hash );
			$liveSpecs = $this->parserOutput->getExtensionData( 'graph_live_specs' ) ?: [];
			$liveSpecs[$hash] = $data;
			$this->parserOutput->setExtensionData( 'graph_live_specs', $liveSpecs );
			$isFallback = isset( $args[ 'fallback' ] ) && $args[ 'fallback' ] !== '';

			if ( $isFallback ) {
				global $wgThumbLimits, $wgDefaultUserOptions;
				/* @phan-suppress-next-line PhanTypeArraySuspiciousNullable */
				$fallbackArgTitle = $args[ 'fallback' ];
				$services = MediaWikiServices::getInstance();
				$fallbackParser = $services->getParser();
				$title = Title::makeTitle( NS_FILE, $fallbackArgTitle );
				$file = $services->getRepoGroup()->findFile( $title );
				$imgFallbackParams = [];

				if ( isset( $args[ 'fallbackWidth' ] ) && $args[ 'fallbackWidth' ] > 0 ) {
					$width = $args[ 'fallbackWidth' ];
					$imgFallbackParams[ 'width' ] = $width;

				} elseif ( property_exists( $data, 'width' ) ) {
					$width = is_int( $data->width ) ? $data->width : 0;

					$imgFallbackParams[ 'width' ] = $width;
				} else {
					$imgFallbackParams[ 'width' ] = $wgThumbLimits[ $wgDefaultUserOptions[ 'thumbsize' ] ];
				}

				$imgFallback = Linker::makeImageLink( $fallbackParser, $title, $file, [ '' ], $imgFallbackParams );

				$noSriptAttrs = [
					'class' => 'mw-graph-noscript',

				];
				// $html will be injected with a <canvas> tag
				$html = Html::rawElement( 'noscript', $noSriptAttrs, $imgFallback );

			} else {
				$attribs[ 'class' ] .= ' mw-graph-nofallback';
				$html = '';
			}
		} else {
			// Image from Graphoid
			$server = rawurlencode( $wgServerName );
			$titleText = rawurlencode( $title->getPrefixedDBkey() );
			$revid = rawurlencode( (string)$revid ) ?: '0';
			$url = sprintf( $wgGraphImgServiceUrl, $server, $titleText, $revid, $hash );
			$imgAttrs = [
				'class' => 'mw-graph-img',
				'src' => $url,
			];
			if ( $graphTitle ) {
				// only add alt tag if we have some descriptive text
				$imgAttrs['alt'] = $graphTitle;
			}
			$html = Html::rawElement( 'img', $imgAttrs );

			if ( $isInteractive ) {
				// Allow image to interactive switchover
				$this->parserOutput->setExtensionData( 'graph_interact', true );
				$attribs = self::buildDivAttributes( 'interactable', $data, $hash );

				// add the overlay title
				if ( $graphTitle ) {
					$hoverTitle = Html::element( 'div', [ 'class' => 'mw-graph-hover-title' ],
						$graphTitle );
				} else {
					$hoverTitle = '';
				}

				// Add a "make interactive" button
				$button = Html::rawElement( 'div', [ 'class' => 'mw-graph-switch' ],
					Html::rawElement( 'i', [ 'class' => 'icon-play' ], '&#9658;' ) );

				$html .= Html::rawElement( 'div', [
					'class' => 'mw-graph-layover',
				], $hoverTitle . $button );
			} else {
				$attribs = self::buildDivAttributes( '', $data );
			}
		}

		return Html::rawElement( 'div', $attribs, $html );
	}
}
