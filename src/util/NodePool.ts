/**
 * Object pool for reusing DOM node instances to reduce allocation overhead.
 * This pool implements a simple free-list strategy for frequently created node types.
 */

export interface PoolableNode {
  _reset(): void
}

/**
 * Generic object pool implementation
 */
class ObjectPool<T extends PoolableNode> {
  private _pool: T[] = []
  private _factory: () => T
  private _maxSize: number

  constructor(factory: () => T, maxSize: number = 1000) {
    this._factory = factory
    this._maxSize = maxSize
  }

  /**
   * Acquire an object from the pool or create a new one
   */
  acquire(): T {
    if (this._pool.length > 0) {
      return this._pool.pop()!
    }
    return this._factory()
  }

  /**
   * Release an object back to the pool
   */
  release(obj: T): void {
    if (this._pool.length < this._maxSize) {
      obj._reset()
      this._pool.push(obj)
    }
  }

  /**
   * Clear the pool
   */
  clear(): void {
    this._pool = []
  }

  /**
   * Get current pool size
   */
  get size(): number {
    return this._pool.length
  }
}

/**
 * Cache for frequently accessed node properties and tree traversal results
 */
export class NodeCache {
  private _propertyCache = new Map<any, Map<string, any>>()
  private _traversalCache = new Map<any, any[]>()
  private _maxCacheSize = 500

  /**
   * Get a cached property value
   */
  getProperty(node: any, key: string): any {
    const nodeCache = this._propertyCache.get(node)
    return nodeCache ? nodeCache.get(key) : undefined
  }

  /**
   * Set a cached property value
   */
  setProperty(node: any, key: string, value: any): void {
    let nodeCache = this._propertyCache.get(node)
    if (!nodeCache) {
      if (this._propertyCache.size >= this._maxCacheSize) {
        // Simple LRU: remove first entry
        const firstKey = this._propertyCache.keys().next().value
        this._propertyCache.delete(firstKey)
      }
      nodeCache = new Map()
      this._propertyCache.set(node, nodeCache)
    }
    nodeCache.set(key, value)
  }

  /**
   * Invalidate property cache for a node
   */
  invalidateProperty(node: any, key?: string): void {
    if (key) {
      const nodeCache = this._propertyCache.get(node)
      if (nodeCache) {
        nodeCache.delete(key)
      }
    } else {
      this._propertyCache.delete(node)
    }
  }

  /**
   * Get cached traversal result
   */
  getTraversal(node: any): any[] | undefined {
    return this._traversalCache.get(node)
  }

  /**
   * Set cached traversal result
   */
  setTraversal(node: any, result: any[]): void {
    if (this._traversalCache.size >= this._maxCacheSize) {
      const firstKey = this._traversalCache.keys().next().value
      this._traversalCache.delete(firstKey)
    }
    this._traversalCache.set(node, result)
  }

  /**
   * Invalidate traversal cache
   */
  invalidateTraversal(node?: any): void {
    if (node) {
      this._traversalCache.delete(node)
    } else {
      this._traversalCache.clear()
    }
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this._propertyCache.clear()
    this._traversalCache.clear()
  }
}

/**
 * Attribute cache for fast attribute lookups
 */
export class AttributeCache {
  private _cache = new Map<any, Map<string, any>>()
  private _maxCacheSize = 500

  /**
   * Get a cached attribute
   */
  get(element: any, name: string): any {
    const elemCache = this._cache.get(element)
    return elemCache ? elemCache.get(name) : undefined
  }

  /**
   * Set a cached attribute
   */
  set(element: any, name: string, attr: any): void {
    let elemCache = this._cache.get(element)
    if (!elemCache) {
      if (this._cache.size >= this._maxCacheSize) {
        const firstKey = this._cache.keys().next().value
        this._cache.delete(firstKey)
      }
      elemCache = new Map()
      this._cache.set(element, elemCache)
    }
    elemCache.set(name, attr)
  }

  /**
   * Invalidate cached attribute
   */
  invalidate(element: any, name?: string): void {
    if (name) {
      const elemCache = this._cache.get(element)
      if (elemCache) {
        elemCache.delete(name)
      }
    } else {
      this._cache.delete(element)
    }
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this._cache.clear()
  }
}

// Singleton instances
export const nodeCache = new NodeCache()
export const attributeCache = new AttributeCache()

/**
 * Export pool creation function
 */
export function createNodePool<T extends PoolableNode>(
  factory: () => T,
  maxSize?: number
): ObjectPool<T> {
  return new ObjectPool(factory, maxSize)
}
