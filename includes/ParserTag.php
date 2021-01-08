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
		if ( $specs === null ) {
			return;
		}
		$parser->addTrackingCategory( 'graph-tracking-category' );

		// We can only load one version of vega lib - either 1 or 2
		// If the default version is 1, and if any of the graphs need Vega2,
		// we treat all graphs as Vega2 and load corresponding libraries.
		// All this should go away once we drop Vega1 support.

		$liveSpecs = $parserOutput->getExtensionData( 'graph_live_specs' );

		if ( $parser->getOptions()->getIsPreview() ) {
			// Preview generates HTML that is different from normal
			$parserOutput->updateCacheExpiry( 0 );
		}

		$parserOutput->addModuleStyles( [ 'ext.graph.styles' ] );
		if ( !$liveSpecs ) {
			// Not in live mode
			$parserOutput->addModules( [ 'ext.graph.loader', 'ext.graph.vega2' ] );
			return;
		}
		// Module: ext.graph.vega1, ext.graph.vega2
		$parserOutput->addModules( [ 'ext.graph.vega' .
			( $parserOutput->getExtensionData( 'graph_vega2' ) ? 2 : 1 ) ] );
		$parserOutput->addJsConfigVars( 'wgGraphSpecs', $liveSpecs );
	}

	/**
	 * @param string $mode lazyload|interactable(click to load)|always(live)|''
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
	 *      title: no longer used?
	 *      fallback: title of a fallback image for noscript
	 *      fallbackWidth: width of the fallback image
	 *      fallbackHeight: height of the fallback image
	 * @return string
	 */
	public function buildHtml( $jsonText, Title $title, $revid, $args = null ) {
		$jsonText = trim( $jsonText );
		if ( $jsonText === '' ) {
			return $this->formatError( wfMessage( 'graph-error-empty-json' ) );
		}
		$status = FormatJson::parse( $jsonText, FormatJson::TRY_FIXING | FormatJson::STRIP_COMMENTS );
		if ( !$status->isOK() ) {
			return $this->formatStatus( $status );
		}

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
		// This allows retrieval via API at a later point
		$specs = $this->parserOutput->getExtensionData( 'graph_specs' ) ?: [];
		// Make sure that multiple json blobs that only differ in spacing hash the same
		$hash = sha1( FormatJson::encode( $data, false, FormatJson::ALL_OK ) );
		$specs[$hash] = $data;
		$this->parserOutput->setExtensionData( 'graph_specs', $specs );

		// Switching this to false (lazyload), will break cache
		$alwaysMode = true;
		/* @phan-suppress-next-line PhanRedundantCondition */
		if ( $this->parserOptions->getIsPreview() || $alwaysMode ) {
			// Add this data directly in the pagebody on previews
			$liveSpecs = $this->parserOutput->getExtensionData( 'graph_live_specs' ) ?: [];
			$liveSpecs[$hash] = $data;
			$this->parserOutput->setExtensionData( 'graph_live_specs', $liveSpecs );
			$attribs = self::buildDivAttributes( 'always', $data, $hash );
		} else {
			$attribs = self::buildDivAttributes( 'lazyload', $data, $hash );
		}

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

		return Html::rawElement( 'div', $attribs, $html );
	}
}
