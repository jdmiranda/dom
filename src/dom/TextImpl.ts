import { NodeType, Text, HTMLSlotElement, Document, Slot } from "./interfaces"
import { CharacterDataImpl } from "./CharacterDataImpl"
import { text_contiguousTextNodes, text_split } from "../algorithm"
import { idl_defineConst } from "../algorithm/WebIDLAlgorithm"
import { createNodePool, PoolableNode } from "../util"

/**
 * Represents a text node.
 */
export class TextImpl extends CharacterDataImpl implements Text, PoolableNode {

  _nodeType!: NodeType

  _name: string = ''
  _assignedSlot: Slot | null = null

  /**
   * Initializes a new instance of `Text`.
   *
   * @param data - the text content
   */
  public constructor(data: string = '') {
    super(data)
  }

  /**
   * Reset the text node for pooling
   */
  _reset(): void {
    this._data = ''
    this._name = ''
    this._assignedSlot = null
    this._parent = null
    this._firstChild = null
    this._lastChild = null
    this._previousSibling = null
    this._nextSibling = null
  }

  /** @inheritdoc */
  get wholeText(): string {
    /**
     * The wholeText attribute’s getter must return the concatenation of the 
     * data of the contiguous Text nodes of the context object, in tree order.
     */
    let text = ''

    for (const node of text_contiguousTextNodes(this, true)) {
      text = text + node._data
    }

    return text
  }

  /** @inheritdoc */
  splitText(offset: number): Text {
    /**
     * The splitText(offset) method, when invoked, must split context object
     * with offset offset.
     */
    return text_split(this, offset)
  }

  // MIXIN: Slotable
  /* istanbul ignore next */
  get assignedSlot(): HTMLSlotElement | null { throw new Error("Mixin: Slotable not implemented.") }

  /**
   * Creates a `Text`.
   *
   * @param document - owner document
   * @param data - the text content
   */
  static _create(document: Document, data: string = ''): TextImpl {
    const node = textNodePool.acquire()
    node._data = data
    node._nodeDocument = document
    return node
  }

}

/**
 * Initialize prototype properties
 */
idl_defineConst(TextImpl.prototype, "_nodeType", NodeType.Text)

/**
 * Text node pool for performance optimization
 */
const textNodePool = createNodePool(() => new TextImpl(), 1000)
