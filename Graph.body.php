<?php
/**
 *
 * @license MIT
 * @file
 *
 * @author Dan Andreescu, Yuri Astrakhan
 */

namespace Graph;

use FormatJson;
use Html;
use JsonConfig\JCContent;
use JsonConfig\JCContentView;
use JsonConfig\JCSingleton;
use Parser;
use ParserOptions;
use ParserOutput;
use Title;

class Singleton {

	public static function onParserFirstCallInit( Parser $parser ) {
		global $wgEnableGraphParserTag;
		if ( $wgEnableGraphParserTag ) {
			$parser->setHook( 'graph', 'Graph\Singleton::onGraphTag' );
		}
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
		// TODO: we might want to add some magic $args parameter to disable template expansion
		$input = $parser->recursiveTagParse( $input, $frame );

		$content = new Content( $input, 'graph-temp.json', true );
		if ( $content->isValid() ) {
			self::updateParser( $parser->getOutput() );
		}
		return $content->getHtml();
	}

	public static function updateParser( ParserOutput $parserOutput ) {
		global $wgGraphDataDomains;
		$parserOutput->addJsConfigVars( 'wgGraphDataDomains', $wgGraphDataDomains );
		$parserOutput->addModules( 'ext.graph' );
		return $parserOutput;
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
		return $this->getHtml();
	}

	public function getParserOutput( Title $title, $revId = null, ParserOptions $options = null,
	                                 $generateHtml = true ) {
		return Singleton::updateParser( parent::getParserOutput( $title, $revId, $options, $generateHtml ) );
	}

	protected function createDefaultView() {
		return new ContentView();
	}
}

class ContentView extends JCContentView {

	/**
	 * Render JCContent object as HTML
	 * @param JCContent $content
	 * @return string
	 */
	public function valueToHtml( JCContent $content ) {
		return Html::element( 'div', array(
			'class' => 'mw-wiki-graph',
			'data-spec' => FormatJson::encode( $content->getData(), false, FormatJson::UTF8_OK ),
		) );
	}

	/**
	 * Returns default content for this object.
	 * The returned valued does not have to be valid JSON
	 * @param string $modelId
	 * @return string
	 */
	public function getDefault( $modelId ) {
		return '{}';
	}
}
