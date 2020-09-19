<?php

namespace Graph;

use Html;
use SpecialPage;

class Sandbox extends SpecialPage {

	public const PAGENAME = 'GraphSandbox';

	public function __construct() {
		parent::__construct( self::PAGENAME );
	}

	protected function getGroupName() {
		return 'wiki';
	}

	/**
	 * Main execution function
	 * @param string|null $par Parameters passed to the page
	 */
	public function execute( $par ) {
		$out = $this->getContext()->getOutput();

		$this->setHeaders();
		$this->addHelpLink( 'Extension:Graph/Guide' );
		$out->addModules( 'ext.graph.sandbox' );
		// Tell CodeEditor that this page is JSON (T143165)
		$out->addJsConfigVars( 'wgCodeEditorCurrentLanguage', 'json' );

		$attr = ParserTag::buildDivAttributes( 'always' );
		$attr['id'] = 'mw-graph-image';
		$graphHtml = Html::rawElement( 'div', $attr, '' );

		// FIXME: make this textarea readonly (but text should be selectable)
		$specHtml = '<div><textarea tabindex="1" accesskey="," id="wpTextbox1" cols="80" rows="40"' .
			' style="" lang="en" dir="ltr" name="wpTextbox1" class="webfonts-changed"></textarea>' .
			'</div>';
		$jsonHtml = '<div><pre id="mw-graph-json"></pre></div>';

		$out->addHTML( Html::rawElement( 'div', [ 'id' => 'mw-graph-sandbox' ],
			Html::rawElement( 'div', [ 'id' => 'mw-graph-left' ], $graphHtml . $jsonHtml ) .
			Html::rawElement( 'div', [ 'id' => 'mw-graph-right' ], $specHtml ) ) );
	}
}
