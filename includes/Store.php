<?php
/**
 *
 * @license MIT
 * @file
 *
 * @author Yuri Astrakhan
 */

namespace Graph;

use ObjectCache;

class Store {
	/**
	 * Store graph data in the memcached
	 * @param string $hash
	 * @param mixed $data Decoded graph spec
	 */
	public static function saveToCache( $hash, $data ) {
		$cache = ObjectCache::getLocalClusterInstance();
		$cache->add( $cache->makeKey( 'graph-data', $hash ), $data );
	}

	/**
	 * Get graph data from memcached
	 * @param string $hash
	 * @return mixed Decoded graph spec
	 */
	public static function getFromCache( $hash ) {
		$cache = ObjectCache::getLocalClusterInstance();
		return $cache->get( $cache->makeKey( 'graph-data', $hash ) );
	}
}
