<?php
/**
 *
 * @license MIT
 * @file
 *
 * @author Yuri Astrakhan
 */

namespace Graph;

use MediaWiki\Api\ApiBase;
use MediaWiki\Api\ApiMain;
use MediaWiki\Json\FormatJson;
use MediaWiki\Page\WikiPageFactory;
use MediaWiki\Parser\ParserFactory;
use MediaWiki\Parser\ParserOptions;
use MediaWiki\Title\Title;
use Wikimedia\ObjectCache\WANObjectCache;
use Wikimedia\ParamValidator\ParamValidator;

/**
 * This class implements action=graph api, allowing client-side graphs to get the spec,
 * regardless of how it is stored (page-props or other storage)
 * @package Graph
 */
class ApiGraph extends ApiBase {
	private ParserFactory $parserFactory;
	private WANObjectCache $cache;
	private WikiPageFactory $wikiPageFactory;

	public function __construct(
		ApiMain $main,
		string $action,
		ParserFactory $parserFactory,
		WANObjectCache $cache,
		WikiPageFactory $wikiPageFactory
	) {
		parent::__construct( $main, $action );
		$this->parserFactory = $parserFactory;
		$this->cache = $cache;
		$this->wikiPageFactory = $wikiPageFactory;
	}

	public function execute() {
		$params = $this->extractRequestParams();

		$this->requireOnlyOneParameter( $params, 'title', 'text' );

		if ( $params['title'] !== null ) {
			if ( $params['hash'] === null ) {
				$this->dieWithError( [ 'apierror-invalidparammix-mustusewith', 'title', 'hash' ],
					'missingparam' );
			}
			$graph = $this->getGraphSpec( $params['title'], $params['oldid'], $params['hash'] );
		} else {
			if ( !$this->getRequest()->wasPosted() ) {
				$this->dieWithError( 'apierror-graph-mustposttext', 'mustposttext' );
			}
			if ( $params['hash'] !== null ) {
				$this->dieWithError( [ 'apierror-invalidparammix-cannotusewith', 'hash', 'text' ],
					'invalidparammix' );
			}
			$graph = $this->preprocess( $params['text'] );
		}

		$this->getMain()->setCacheMode( 'public' );
		$this->getResult()->addValue( null, $this->getModuleName(), $graph );
	}

	/**
	 * @inheritDoc
	 */
	public function getAllowedParams() {
		return [
			'hash' => [
				ParamValidator::PARAM_TYPE => 'string',
			],
			'title' => [
				ParamValidator::PARAM_TYPE => 'string',
			],
			'text' => [
				ParamValidator::PARAM_TYPE => 'string',
			],
			'oldid' => [
				ParamValidator::PARAM_TYPE => 'integer',
				ParamValidator::PARAM_DEFAULT => 0
			],
		];
	}

	/**
	 * @inheritDoc
	 */
	protected function getExamplesMessages() {
		return [
			'formatversion=2&action=graph&title=Extension%3AGraph%2FDemo' .
				'&hash=1533aaad45c733dcc7e07614b54cbae4119a6747' => 'apihelp-graph-example',
		];
	}

	/**
	 * Parse graph definition that may contain wiki markup into pure json
	 * @param string $text
	 * @return string
	 */
	private function preprocess( $text ) {
		$title = Title::makeTitle( NS_SPECIAL, Sandbox::PAGENAME )->fixSpecialName();
		$text = $this->parserFactory->getInstance()
			->preprocess( $text, $title, new ParserOptions( $this->getUser() ) );
		$st = FormatJson::parse( $text, FormatJson::TRY_FIXING | FormatJson::STRIP_COMMENTS );
		if ( !$st->isOK() ) {
			// Sometimes we get <graph ...> {...} </graph> as input. Try to strip <graph> tags
			$count = 0;
			$text = preg_replace( '/^\s*<graph[^>]*>(.*)<\/graph>\s*$/s', '$1', $text, 1, $count );
			if ( $count === 1 ) {
				$st = FormatJson::parse( $text );
			}
			if ( !$st->isOK() ) {
				$this->dieWithError( 'apierror-graph-invalid', 'invalidtext' );
			}
		}
		return $st->getValue();
	}

	/**
	 * Get graph definition with title and hash
	 * @param string $titleText
	 * @param int $revId
	 * @param string $hash
	 * @return mixed Decoded graph spec from the DB or the stash
	 */
	private function getGraphSpec( $titleText, $revId, $hash ) {
		$title = Title::newFromText( $titleText );
		if ( !$title ) {
			$this->dieWithError( [ 'apierror-invalidtitle', wfEscapeWikiText( $titleText ) ] );
		}

		// @phan-suppress-next-line PhanTypeMismatchArgumentNullable T240141
		$page = $this->wikiPageFactory->newFromTitle( $title );
		if ( !$page->exists() ) {
			$this->dieWithError( 'apierror-missingtitle' );
		}

		// @phan-suppress-next-line PhanTypeMismatchArgumentNullable T240141
		$this->checkTitleUserPermissions( $title, 'read' );

		// Use caching to avoid parses for old revisions and I/O for current revisions
		$graph = $this->cache->getWithSetCallback(
			$this->cache->makeKey( 'graph-data', $hash, $page->getTouched() ),
			$this->cache::TTL_DAY,
			static function ( $oldValue, &$ttl ) use ( $page, $revId, $hash ) {
				$value = false;
				$parserOptions = ParserOptions::newFromAnon();
				$parserOutput = $page->getParserOutput( $parserOptions, $revId );

				if ( $parserOutput !== false ) {
					$allGraphs = $parserOutput->getExtensionData( 'graph_specs_index' );
					if ( is_array( $allGraphs ) && array_key_exists( $hash, $allGraphs ) ) {
						$value = $parserOutput->getExtensionData( 'graph_specs[' . $hash . ']' );
					}
				}

				return $value;
			}
		);

		if ( !$graph ) {
			$this->dieWithError( 'apierror-graph-missing', 'invalidhash' );
		}

		return $graph;
	}
}
