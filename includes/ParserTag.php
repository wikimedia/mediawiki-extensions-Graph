<?php
/**
 *
 * @license MIT
 * @file
 *
 * @author Dan Andreescu, Yuri Astrakhan, Frédéric Bolduc, Joseph Seddon, Isabelle Hurbain-Palatin
 */

namespace Graph;

use FormatJson;
use Html;
use Language;
use Linker;
use MediaWiki\MediaWikiServices;
use MediaWiki\Page\PageReference;
use Message;
use OutputPage;
use Parser;
use ParserOptions;
use ParserOutput;
use PPFrame;
use Status;
use Title;

class ParserTag {
	/** Sync with mapSchema.js */
	private const DEFAULT_WIDTH = 500;
	private const DEFAULT_HEIGHT = 500;

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
	public function __construct(
		Parser $parser, ParserOptions $parserOptions, ParserOutput $parserOutput
	) {
		$this->parserOptions = $parserOptions;
		$this->parserOutput = $parserOutput;
		$this->language = $parser->getTargetLanguage();
	}

	/**
	 * @param string|null $input
	 * @param array $args
	 * @param Parser $parser
	 * @param PPFrame $frame
	 * @return string
	 */
	public static function onGraphTag( $input, array $args, Parser $parser, PPFrame $frame ) {
		$tag = new self( $parser, $parser->getOptions(), $parser->getOutput() );
		$html = $tag->buildHtml( (string)$input, $parser->getRevisionId(), $args );
		self::addTagMetadata( $parser->getOutput(), $parser->getPage(), $parser->getOptions()->getIsPreview() );
		return $html;
	}

	/**
	 * @param ParserOutput $parserOutput
	 * @param ?PageReference $pageRef
	 * @param bool $isPreview
	 */
	public static function addTagMetadata(
		ParserOutput $parserOutput, ?PageReference $pageRef, bool $isPreview
	): void {
		$tc = MediaWikiServices::getInstance()->getTrackingCategories();
		if ( $parserOutput->getExtensionData( 'graph_specs_broken' ) ) {
			$tc->addTrackingCategory( $parserOutput, 'graph-broken-category', $pageRef );
		}
		if ( $parserOutput->getExtensionData( 'graph_specs_obsolete' ) ) {
			$tc->addTrackingCategory( $parserOutput, 'graph-obsolete-category', $pageRef );
		}
		$specs = $parserOutput->getExtensionData( 'graph_specs_index' );
		if ( $specs === null ) {
			return;
		}
		$tc->addTrackingCategory( $parserOutput, 'graph-tracking-category', $pageRef );

		if ( $isPreview ) {
			// Preview generates HTML that is different from normal
			$parserOutput->updateCacheExpiry( 0 );
		}
	}

	/**
	 * @param OutputPage $outputPage
	 * @param ParserOutput $parserOutput
	 */
	public static function finalizeParserOutput(
		OutputPage $outputPage, ParserOutput $parserOutput
	): void {
		$specs = $parserOutput->getExtensionData( 'graph_specs_index' );
		if ( $specs === null ) {
			return;
		}

		$outputPage->addModuleStyles( [ 'ext.graph.styles' ] );
		// We can only load one version of vega lib - either 1 or 2
		// If the default version is 1, and if any of the graphs need Vega2,
		// we treat all graphs as Vega2 and load corresponding libraries.
		// All this should go away once we drop Vega1 support.
		$liveSpecsIndex = $parserOutput->getExtensionData( 'graph_live_specs_index' );
		$outputPage->addModules( [ 'ext.graph.loader' ] );
		$liveSpecs = [];
		foreach ( $liveSpecsIndex as $hash => $ignore ) {
			$liveSpecs[$hash] =
				$parserOutput->getExtensionData( 'graph_live_specs[' . $hash . ']' );
		}
		$outputPage->addJsConfigVars( 'wgGraphSpecs', $liveSpecs );
	}

	/**
	 * @param string $mode lazyload|interactable(click to load)|always(live)|''
	 * @param mixed $data
	 * @param string $hash
	 * @return array
	 */
	public static function buildDivAttributes( $mode = '', $data = false, $hash = '' ) {
		$attribs = [ 'class' => 'mw-graph mw-graph-clickable' ];

		if ( is_object( $data ) ) {
			$width = property_exists( $data, 'width' ) && is_int( $data->width ) ? $data->width : self::DEFAULT_WIDTH;
			$height =
				property_exists( $data, 'height' ) && is_int( $data->height ) ? $data->height : self::DEFAULT_HEIGHT;
			if ( $width && $height ) {
				$attribs['style'] = "width:{$width}px;height:{$height}px;aspect-ratio:$width/$height";
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
	 * @param int $revid
	 * @param array|null $args
	 *      title: no longer used?
	 *      fallback: title of a fallback image for noscript
	 *      fallbackWidth: width of the fallback image
	 *      fallbackHeight: height of the fallback image
	 * @return string
	 */
	public function buildHtml( $jsonText, $revid, $args = null ) {
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

		// Figure out which vega version to use (TODO drop this)
		global $wgGraphDefaultVegaVer;
		if ( property_exists( $data, '$schema' ) ) {
			if ( !preg_match(
				// https://vega.github.io/schema/
				'!https://vega.github.io/schema/(vega|vega-lite)/v(\d)(?:\.\d){0,2}.json!',
				$data->{'$schema'},
				$matches
			) ) {
				return $this->formatError( wfMessage( 'graph-error-not-vega' ) );
			} elseif ( $matches[1] === 'vega-lite' ) {
				return $this->formatError( wfMessage( 'graph-error-vega-lite-unsupported' ) );
			}
			$version = (int)$matches[2];
		} elseif ( property_exists( $data, 'version' ) && is_numeric( $data->version ) ) {
			$version = $data->version;
		} else {
			$version = $data->version = $wgGraphDefaultVegaVer;
		}
		if ( $version === 2 ) {
			$this->parserOutput->setExtensionData( 'graph_vega2', true );
			$this->parserOutput->setExtensionData( 'graph_specs_obsolete', true );
		} elseif ( $version === 5 ) {
			$this->parserOutput->setExtensionData( 'graph_vega5', true );
		} else {
			return $this->formatError( wfMessage( 'graph-error-vega-unsupported-version', $version ) );
		}

		// Make sure that multiple json blobs that only differ in spacing hash the same
		$hash = sha1( FormatJson::encode( $data, false, FormatJson::ALL_OK ) );

		// graph_specs is used in ApiGraph; graph_specs_index is also used to set up the
		// graph tracking category and to gate finalizeParserOutput (we only check whether it's
		// null or not in those two instances)
		// TODO: consider merging graph_specs and graph_live_specs to a unique "array" instead of 2
		$this->parserOutput->appendExtensionData( 'graph_specs_index', $hash );
		$this->parserOutput->setExtensionData( 'graph_specs[' . $hash . ']', $data );

		// Switching this to false (lazyload), will break cache
		$alwaysMode = true;
		/* @phan-suppress-next-line PhanRedundantCondition */
		if ( $this->parserOptions->getIsPreview() || $alwaysMode ) {
			$this->parserOutput->appendExtensionData( 'graph_live_specs_index', $hash );
			$this->parserOutput->setExtensionData( 'graph_live_specs[' . $hash . ']', $data );
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
