<?php

namespace Graph;

use Html;
use SpecialPage;

class Sandbox extends SpecialPage {

	const PageName = 'GraphSandbox';

	/**
	 * Constructor
	 */
	public function __construct() {
		parent::__construct( self::PageName );
	}

	protected function getGroupName() {
		return 'wiki';
	}

	/**
	 * Main execution function
	 * @param $par string|null Parameters passed to the page
	 */
	public function execute( $par ) {
		$out = $this->getContext()->getOutput();

		$this->setHeaders();
		$out->addModules( 'ext.graph.sandbox' );

		$attr = Singleton::buildDivAttributes( 'always' );
		$attr['id'] = 'mw-graph-image';
		$graphHtml = Html::rawElement( 'div', $attr, '' );

		// FIXME: make this textarea readonly (but text should be selectable)
		$logHtml = '<div><pre id="mw-graph-log" dir="ltr"></pre></div>';
		$specHtml = '<div><textarea tabindex="1" accesskey="," id="wpTextbox1" cols="80" rows="40" style="" lang="en" dir="ltr" name="wpTextbox1" class="webfonts-changed"></textarea></div>';
		$jsonHtml = '<div><pre id="mw-graph-json"></pre></div>';

		$out->addHTML( Html::rawElement( 'div', array( 'id' => 'mw-graph-sandbox' ),
			Html::rawElement( 'div', array( 'id' => 'mw-graph-left' ), $graphHtml . $logHtml ) .
			Html::rawElement( 'div', array( 'id' => 'mw-graph-right' ), $specHtml . $jsonHtml ) ) );
	}
}
