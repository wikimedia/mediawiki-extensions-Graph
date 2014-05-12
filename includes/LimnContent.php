<?php
/**
 *
 * @license MIT
 * @file
 *
 * @author Dan Andreescu
 */


/**
 * Class LimnContent represents JSON content that Limn understands
 * as the definition of a visualization.
 *
 * This is based on TextContent, and represents JSON as a string.
 *
 * TODO: determine if a different representation makes more sense and implement it with
 * LimnContentHandler::serializeContent() and LimnContentHandler::unserializeContent()
 *
 * TODO: create a visual editor for Limn definitions that introspects what is allowed
 * in each part of the definition and presents documentation to aid with discovery.
 *
 */
class LimnContent extends \TextContent {

    public function __construct( $text, $model_id = CONTENT_MODEL_LIMN_DATA ) {
        parent::__construct( $text, $model_id );
    }

    public function getHtml() {
        $html = $this->getNativeData();
        $html = Html::element( 'div', array(
            'class' => 'mw-wiki-limn',
            'data-spec' => $html,
        ));
        return $html;
    }

    public function getWikitextForTransclusion() {
        return $this->getHtml();
    }

    public function getParserOutput( Title $title,
        $revId = null,
        ParserOptions $options = null, $generateHtml = true
    ) {
        $parserOutput = parent::getParserOutput( $title, $revId, $options, $generateHtml );
        $parserOutput->addModules( 'ext.limn' );
        return $parserOutput;
    }

    public function isEmpty() {
        $text = trim( strip_tags( $this->getNativeData() ) );
        return $text === '' || $text === '{}';
    }

    /*
     * Determines whether this content should be considered a "page" for statistics
     * In our case, just making sure it's not empty or a redirect
     *
     */
    public function isCountable( $hasLinks = null ) {
        return !$this->isEmpty() && !$this->isRedirect();
    }

    public function prepareSave( WikiPage $page, $flags, $baseRevId, User $user ) {
        $rawJSON = $this->getNativeData();

        // TODO: parse document as a Limn definition using maybe a Node server
        $doc = $rawJSON;
        $errors = null;
        $status = Status::newGood();

        if ( !$doc || $errors ) {
            $status->fatal( 'content-failed-to-parse', "Limn", "", $errors );
        }

        return $status;
    }

    public function isValid() {
        // TODO: check validity here once it's implemented properly in prepareSave
        // TODO: validate that the URLs used in the spec are not hitting outside sites
        // Because isValid, unlike prepareSave, ALWAYS happens, no matter whether
        // the content was edited, imported, restored, or what.
        //
        // The downside is that it's too late here for meaningful interaction
        // with the user, we can just abort the save operation, casing an internal
        // error.
        return parent::isValid();
    }

    public function getTextForSearchIndex() {
        // TODO: return text relevant to the wiki's search index,
        // maybe by calling a Node server that understands the JSON,
        // or by extending the definition with some optional metadata and
        return $this->getNativeData();
    }

    public function convert( $toModel, $lossy = '' ) {
        // TODO: find out where / how this is needed and if we should do anything else
        return parent::convert( $toModel, $lossy );
    }

    public function getSection( $sectionId ) {
        // TODO: do sections make sense here?
        return parent::getSection( $sectionId );
    }

    public function replaceSection( $section, Content $with, $sectionTitle = '' ) {
        // TODO: if sections make sense here, implement replacing
        return parent::replaceSection( $section, $with, $sectionTitle );
    }
}
