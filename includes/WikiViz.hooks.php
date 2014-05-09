<?php
/**
 * Hooks for Geo extension.
 *
 * @file
 *
 * @ingroup Extensions
 * @ingroup EventLogging
 *
 */

class VizHooks {
	public static function getSkinConfigVariables( $data ) {
		global $extWikiVizTileServer,
			$extWikiVizImagePath,
			$extWikiVizAttribution;

		$vars = array(
			'extWikiVizTileServer' => $extWikiVizTileServer,
			'extWikiVizAttribution' => $extWikiVizAttribution,
			'extWikiVizImagePath' => $extWikiVizImagePath,
		);
		if ( $data ) {
			$vars['extWikiVizCurrentViz'] = $data;
		}
		return $vars;
	}

	public static function onBeforePageDisplay( $out, $skin ) {
		$title = $out->getTitle();

		$action = Action::getActionName( $out->getContext() );
		if ( $title->getNamespace() === NS_VIZ && $action === 'view' ) {
			$page = WikiPage::factory( $title );
			if ( $page->exists() ) {
				$content = $page->getContent();
				$data = $content->getJsonData();
			} else {
				$data = null;
			}

			$out->clearHtml();
			$out->addHtml( '<div id="mw-wiki-viz-main" class="mw-wiki-viz"></div>' );
			$out->addJsConfigVars( self::getSkinConfigVariables( $data ) );
			$out->addModuleStyles( 'wikiviz.styles' );
			$out->addModules( 'wikiviz.scripts' );
		}
        //$out->addHtml( "<pre>$title</pre>" );
        //$page = WikiPage::factory( $title );
        //$content = $page->getContent();
        //$out->addHtml( "<pre>$content</pre>" );
		return true;
	}

	/**
	 * Declares JSON as the code editor language for Schema: pages.
	 * This hook only runs if the CodeEditor extension is enabled.
	 * @param Title $title
	 * @param string &$lang Page language.
	 * @return bool
	 */
	static function onCodeEditorGetPageLanguage( $title, &$lang ) {
		if ( $title->getContentModel() === 'GeoJSON' ) {
			$lang = 'json';
		}
		return true;
	}

}
