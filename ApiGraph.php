<?php
/**
 *
 * @license MIT
 * @file
 *
 * @author Yuri Astrakhan
 */

namespace Graph;

use ApiBase;
use FormatJson;
use Title;

/**
 * This class implements action=graph api, allowing client-side graphs to get the spec,
 * regardless of how it is stored (page-props or other storage)
 * Class ApiGraph
 * @package Graph
 */
class ApiGraph extends ApiBase {

	public function execute() {
		$params = $this->extractRequestParams();

		$title = Title::newFromText( $params['title'] );
		if ( !$title || !$title->exists() || !$title->userCan( 'read', $this->getUser() ) ) {
			$this->dieUsage( "Invalid title given.", "invalidtitle" );
		}

		$ppValue = $this->getDB()->selectField( 'page_props', 'pp_value', array(
			'pp_page' => $title->getArticleID(),
			'pp_propname' => 'graph_specs',
		), __METHOD__ );

		$graph = false;
		if ( $ppValue ) {
			$st = FormatJson::parse( $ppValue );
			if ( $st->isOK() ) {
				$allGraphs = $st->getValue();
				$hash = $params['hash'];
				if ( property_exists( $allGraphs, $hash ) ) {
					$graph = $allGraphs->$hash;
				}
			}
		}
		if ( !$graph ) {
			$this->dieUsage( "No graph found.", "invalidhash" );
		}
		$this->getResult()->addValue( null, $this->getModuleName(), $graph );
	}

	public function getAllowedParams() {
		return array(
			'hash' => array(
				ApiBase::PARAM_TYPE => 'string',
				ApiBase::PARAM_REQUIRED => true,
			),
			'title' => array(
				ApiBase::PARAM_TYPE => 'string',
				ApiBase::PARAM_REQUIRED => true,
			),
		);
	}

	protected function getExamplesMessages() {
		return array(
			'formatversion=2&action=graph&title=Extension%3AGraph%2FDemo&hash=1533aaad45c733dcc7e07614b54cbae4119a6747'
				=> 'apihelp-graph-example',
		);
	}
}
