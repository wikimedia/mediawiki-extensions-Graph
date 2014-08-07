<?php
/**
 *
 * @license MIT
 * @file
 *
 * @author Dan Andreescu
 */


/**
 * Class LimnContentHandler represents the set of operations for LimnContent that can be
 * performed without the actual content. Most importantly, it acts as a factory
 * and serialization/unserialization service for LimnContent objects.
 *
 * @see https://github.com/wikimedia/mediawiki-extensions-examples/blob/master/DataPages/XmlContentHandler.php
 */
class LimnContentHandler extends \TextContentHandler {

    public function __construct(
        $modelId = CONTENT_MODEL_LIMN_DATA,
        $formats = array( CONTENT_FORMAT_JSON )
    ) {
        parent::__construct( $modelId, $formats );
    }

    public function serializeContent( Content $content, $format = null ) {
        return parent::serializeContent( $content, $format );
    }

    public function unserializeContent( $text, $format = null ) {
        return new LimnContent( $text );
    }

    public function makeEmptyContent() {
        return new LimnContent( '' );
    }

    public function getActionOverrides() {
        // TODO: Add an override for the edit action to specify a custom editor
        return parent::getActionOverrides();
    }

    public function createDifferenceEngine( IContextSource $context,
        $old = 0, $new = 0, $rcid = 0,
        $refreshCache = false, $unhide = false
    ) {
        return parent::createDifferenceEngine(
            $context, $old, $new, $rcid, $refreshCache, $unhide
        );
    }

    /*
     * Currently just returns false, we do not support section editing
     */
    public function supportsSections() {
        return false;
    }

    /*
     * return true if LimnContent supports representing redirects
     */
    public function supportsRedirects() {
        return parent::supportsRedirects();
    }

    public function merge3( Content $oldContent, Content $myContent, Content $yourContent ) {
        return parent::merge3( $oldContent, $myContent, $yourContent );
    }
}
