<?php
/**
 *
 * @license MIT
 * @file
 *
 * @author Dan Andreescu, Yuri Astrakhan
 */

namespace limn;
use FormatJson;
use Html;
use JsonConfig\JCContent;
use JsonConfig\JCContentView;
use Parser;
use ParserOptions;
use ParserOutput;
use Title;

class Singleton {

	public static function onParserFirstCallInit( Parser $parser ) {
		global $wgEnableLimnParserTag;
		if ( $wgEnableLimnParserTag ) {
			$parser->setHook( 'limn', 'limn\Singleton::onLimnTag' );
		}
		return true;
	}

	public static function onLimnTag( $input, array $args, Parser $parser, \PPFrame $frame ) {

		// expand template arguments and other wiki markup
		// TODO: we might want to add some magic $args parameter to disable template expansion
		$input = $parser->recursiveTagParse( $input, $frame );

		$content = new Content( $input, 'limn-temp.json', true );
		if ( $content->isValid() ) {
			self::updateParser( $parser->getOutput() );
		}
		return $content->getHtml();
	}

	public static function updateParser( ParserOutput $parserOutput ) {
		$parserOutput->addModules( 'ext.limn' );
		return $parserOutput;
	}
}

/**
 * Class Content represents JSON content that Limn understands
 * as the definition of a visualization.
 *
 * This is based on TextContent, and represents JSON as a string.
 *
 * TODO: determine if a different representation makes more sense and implement it with
 * ContentHandler::serializeContent() and ContentHandler::unserializeContent()
 *
 * TODO: create a visual editor for Limn definitions that introspects what is allowed
 * in each part of the definition and presents documentation to aid with discovery.
 *
 * @see https://github.com/wikimedia/mediawiki-extensions-examples/blob/master/DataPages/XmlContent.php
 */
class Content extends JCContent {

    public function getWikitextForTransclusion() {
        return $this->getHtml();
    }

    public function getParserOutput( Title $title,
        $revId = null,
        ParserOptions $options = null, $generateHtml = true
    ) {
        return Singleton::updateParser( parent::getParserOutput( $title, $revId, $options, $generateHtml ) );
    }

	protected function createDefaultView() {
		return new ContentView();
	}
}

class ContentView extends \JsonConfig\JCContentView {

	/**
	 * Render JCContent object as HTML
	 * @param JCContent $content
	 * @return string
	 */
	public function valueToHtml( JCContent $content ) {
		return Html::element( 'div', array(
			'class' => 'mw-wiki-limn',
			'data-spec' => FormatJson::encode( $content->getData(), false, FormatJson::UTF8_OK ),
		));
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
