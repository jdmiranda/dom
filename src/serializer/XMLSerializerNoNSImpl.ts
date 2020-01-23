import {
  Node, Element, NodeType, Document, Comment, Text, DocumentFragment,
  DocumentType, ProcessingInstruction, CDATASection
} from "../dom/interfaces"
import { InvalidStateError } from "../dom/DOMException"
import { xml_isName, xml_isLegalChar, xml_isPubidChar } from "../algorithm"
import { XMLSerializer } from "./interfaces"

/**
 * Represents an XML serializer wihhout namespace support.
 * 
 * Implements: https://www.w3.org/TR/DOM-Parsing/#serializing
 */
export class XMLSerializerNoNSImpl implements XMLSerializer {

  /** @inheritdoc */
  serializeToString(root: Node): string {
    /**
     * The serializeToString(root) method must produce an XML serialization
     * of root passing a value of false for the require well-formed parameter,
     * and return the result.
     */
    return this._xmlSerialization(root, false)
  }

  /**
   * Produces an XML serialization of the given node.
   * 
   * @param node - node to serialize
   * @param requireWellFormed - whether to check conformance
   */
  private _xmlSerialization(node: Node, requireWellFormed: boolean): string {
    /** From: https://w3c.github.io/DOM-Parsing/#xml-serialization
     * 
     * 1. Let namespace be a context namespace with value null. 
     * The context namespace tracks the XML serialization algorithm's current 
     * default namespace. The context namespace is changed when either an Element
     * Node has a default namespace declaration, or the algorithm generates a 
     * default namespace declaration for the Element Node to match its own
     * namespace. The algorithm assumes no namespace (null) to start.
     * 2. Let prefix map be a new namespace prefix map.
     * 3. Add the XML namespace with prefix value "xml" to prefix map.
     * 4. Let prefix index be a generated namespace prefix index with value 1. 
     * The generated namespace prefix index is used to generate a new unique 
     * prefix value when no suitable existing namespace prefix is available to 
     * serialize a node's namespaceURI (or the namespaceURI of one of node's 
     * attributes). See the generate a prefix algorithm.
     */

    /**
     * 5. Return the result of running the XML serialization algorithm on node 
     * passing the context namespace namespace, namespace prefix map prefix map,
     * generated namespace prefix index reference to prefix index, and the 
     * flag require well-formed. If an exception occurs during the execution 
     * of the algorithm, then catch that exception and throw an 
     * "InvalidStateError" DOMException.
     */
    try {
      return this._serializeNode(node, requireWellFormed)
    } catch {
      throw new InvalidStateError()
    }
  }

  /**
   * Produces an XML serialization of a node.
   * 
   * @param node - node to serialize
   * @param requireWellFormed - whether to check conformance
   */
  private _serializeNode(node: Node, requireWellFormed: boolean): string {

    switch (node.nodeType) {
      case NodeType.Element:
        return this._serializeElement(<Element>node, requireWellFormed)
      case NodeType.Document:
        return this._serializeDocument(<Document>node, requireWellFormed)
      case NodeType.Comment:
        return this._serializeComment(<Comment>node, requireWellFormed)
      case NodeType.Text:
        return this._serializeText(<Text>node, requireWellFormed)
      case NodeType.DocumentFragment:
        return this._serializeDocumentFragment(<DocumentFragment>node,
          requireWellFormed)
      case NodeType.DocumentType:
        return this._serializeDocumentType(<DocumentType>node, requireWellFormed)
      case NodeType.ProcessingInstruction:
        return this._serializeProcessingInstruction(<ProcessingInstruction>node,
          requireWellFormed)
      case NodeType.CData:
        return this._serializeCData(<CDATASection>node, requireWellFormed)
      default:
        throw new Error(`Unknown node type: ${node.nodeType}`)
    }
  }

  /**
   * Produces an XML serialization of an element node.
   * 
   * @param node - node to serialize
   * @param requireWellFormed - whether to check conformance
   */
  private _serializeElement(node: Element, requireWellFormed: boolean): string {

    /**
     * From: https://w3c.github.io/DOM-Parsing/#xml-serializing-an-element-node
     * 
     * 1. If the require well-formed flag is set (its value is true), and this 
     * node's localName attribute contains the character ":" (U+003A COLON) or 
     * does not match the XML Name production, then throw an exception; the 
     * serialization of this node would not be a well-formed element.
     */
    if (requireWellFormed && (node.localName.indexOf(":") !== -1 ||
      !xml_isName(node.localName))) {
      throw new Error("Node local name contains invalid characters (well-formed required).")
    }

    /**
     * 2. Let markup be the string "<" (U+003C LESS-THAN SIGN).
     * 3. Let qualified name be an empty string.
     * 4. Let skip end tag be a boolean flag with value false.
     * 5. Let ignore namespace definition attribute be a boolean flag with value
     * false.
     * 6. Given prefix map, copy a namespace prefix map and let map be the 
     * result.
     * 7. Let local prefixes map be an empty map. The map has unique Node prefix 
     * strings as its keys, with corresponding namespaceURI Node values as the 
     * map's key values (in this map, the null namespace is represented by the 
     * empty string).
     * 
     * _Note:_ This map is local to each element. It is used to ensure there 
     * are no conflicting prefixes should a new namespace prefix attribute need 
     * to be generated. It is also used to enable skipping of duplicate prefix 
     * definitions when writing an element's attributes: the map allows the 
     * algorithm to distinguish between a prefix in the namespace prefix map 
     * that might be locally-defined (to the current Element) and one that is 
     * not.
     * 8. Let local default namespace be the result of recording the namespace 
     * information for node given map and local prefixes map.
     * 
     * _Note:_ The above step will update map with any found namespace prefix 
     * definitions, add the found prefix definitions to the local prefixes map 
     * and return a local default namespace value defined by a default namespace 
     * attribute if one exists. Otherwise it returns null.
     * 9. Let inherited ns be a copy of namespace.
     * 10. Let ns be the value of node's namespaceURI attribute.
     */
    let skipEndTag = false

    /** 11. If inherited ns is equal to ns, then: */

    /** 
     * 11.1. If local default namespace is not null, then set ignore 
     * namespace definition attribute to true. 
     * 11.2. If ns is the XML namespace, then append to qualified name the 
     * concatenation of the string "xml:" and the value of node's localName.
     * 11.3. Otherwise, append to qualified name the value of node's 
     * localName. The node's prefix if it exists, is dropped.
     */
    const qualifiedName = node.localName

    /** 11.4. Append the value of qualified name to markup. */
    let markup = "<" + qualifiedName

    /**
     * 13. Append to markup the result of the XML serialization of node's 
     * attributes given map, prefix index, local prefixes map, ignore namespace
     * definition attribute flag, and require well-formed flag.
     */
    markup += this._serializeAttributes(node, requireWellFormed)

    /**
     * 14. If ns is the HTML namespace, and the node's list of children is 
     * empty, and the node's localName matches any one of the following void
     * elements: "area", "base", "basefont", "bgsound", "br", "col", "embed", 
     * "frame", "hr", "img", "input", "keygen", "link", "menuitem", "meta", 
     * "param", "source", "track", "wbr"; then append the following to markup,
     * in the order listed:
     * 14.1. " " (U+0020 SPACE);
     * 14.2. "/" (U+002F SOLIDUS).
     * and set the skip end tag flag to true.
     * 15. If ns is not the HTML namespace, and the node's list of children is 
     * empty, then append "/" (U+002F SOLIDUS) to markup and set the skip end 
     * tag flag to true.
     * 16. Append ">" (U+003E GREATER-THAN SIGN) to markup.
     */
    if (node.childNodes.length === 0) {
      markup += "/"
      skipEndTag = true
    }
    markup += ">"

    /**
     * 17. If the value of skip end tag is true, then return the value of markup
     * and skip the remaining steps. The node is a leaf-node.
     */
    if (skipEndTag) return markup

    /**
     * 18. If ns is the HTML namespace, and the node's localName matches the 
     * string "template", then this is a template element. Append to markup the 
     * result of XML serializing a DocumentFragment node given the template 
     * element's template contents (a DocumentFragment), providing inherited 
     * ns, map, prefix index, and the require well-formed flag.
     * 
     * _Note:_ This allows template content to round-trip, given the rules for 
     * parsing XHTML documents.
     * 
     * 19. Otherwise, append to markup the result of running the XML 
     * serialization algorithm on each of node's children, in tree order, 
     * providing inherited ns, map, prefix index, and the require well-formed 
     * flag.
     */
    for (const childNode of node.childNodes) {
      markup += this._serializeNode(childNode, requireWellFormed)
    }

    /**
     * 20. Append the following to markup, in the order listed:
     * 20.1. "</" (U+003C LESS-THAN SIGN, U+002F SOLIDUS);
     * 20.2. The value of qualified name;
     * 20.3. ">" (U+003E GREATER-THAN SIGN).
     */
    markup += "</" + qualifiedName + ">"

    /**
     * 21. Return the value of markup.
     */
    return markup
  }

  /**
   * Produces an XML serialization of a document node.
   * 
   * @param node - node to serialize
   * @param requireWellFormed - whether to check conformance
   */
  private _serializeDocument(node: Document, requireWellFormed: boolean): string {

    /**
     * If the require well-formed flag is set (its value is true), and this node
     * has no documentElement (the documentElement attribute's value is null), 
     * then throw an exception; the serialization of this node would not be a 
     * well-formed document.
     */
    if (requireWellFormed && node.documentElement === null) {
      throw new Error("Missing document element (well-formed required).")
    }
    /**
     * Otherwise, run the following steps:
     * 1. Let serialized document be an empty string.
     * 2. For each child child of node, in tree order, run the XML 
     * serialization algorithm on the child passing along the provided 
     * arguments, and append the result to serialized document.
     * 
     * _Note:_ This will serialize any number of ProcessingInstruction and
     * Comment nodes both before and after the Document's documentElement node,
     * including at most one DocumentType node. (Text nodes are not allowed as
     * children of the Document.)
     * 
     * 3. Return the value of serialized document.
    */
    let serializedDocument = ""
    for (const childNode of node.childNodes) {
      serializedDocument += this._serializeNode(childNode, requireWellFormed)
    }
    return serializedDocument
  }

  /**
   * Produces an XML serialization of a comment node.
   * 
   * @param node - node to serialize
   * @param requireWellFormed - whether to check conformance
   */
  private _serializeComment(node: Comment, requireWellFormed: boolean): string {

    /**
     * If the require well-formed flag is set (its value is true), and node's 
     * data contains characters that are not matched by the XML Char production 
     * or contains "--" (two adjacent U+002D HYPHEN-MINUS characters) or that 
     * ends with a "-" (U+002D HYPHEN-MINUS) character, then throw an exception;
     * the serialization of this node's data would not be well-formed.
     */
    if (requireWellFormed && (!xml_isLegalChar(node.data) ||
      node.data.indexOf("--") !== -1 || node.data.endsWith("-"))) {
      throw new Error("Comment data contains invalid characters (well-formed required).")
    }

    /**
     * Otherwise, return the concatenation of "<!--", node's data, and "-->".
     */
    return "<!--" + node.data + "-->"
  }

  /**
   * Produces an XML serialization of a text node.
   * 
   * @param node - node to serialize
   * @param requireWellFormed - whether to check conformance
   * @param level - current depth of the XML tree
   */
  private _serializeText(node: Text, requireWellFormed: boolean): string {

    /**
     * 1. If the require well-formed flag is set (its value is true), and 
     * node's data contains characters that are not matched by the XML Char 
     * production, then throw an exception; the serialization of this node's 
     * data would not be well-formed.
     */
    if (requireWellFormed && !xml_isLegalChar(node.data)) {
      throw new Error("Text data contains invalid characters (well-formed required).")
    }

    /**
     * 2. Let markup be the value of node's data.
     * 3. Replace any occurrences of "&" in markup by "&amp;".
     * 4. Replace any occurrences of "<" in markup by "&lt;".
     * 5. Replace any occurrences of ">" in markup by "&gt;".
     * 6. Return the value of markup.
     */
    let markup = ""
    const data = node.data
    for (let i = 0; i < data.length; i++) {
      const c = data[i]
      if (c === "&")
        markup += "&amp;"
      else if (c === "<")
        markup += "&lt;"
      else if (c === ">")
        markup += "&gt;"
      else
        markup += c
    }
    return markup
  }

  /**
   * Produces an XML serialization of a document fragment node.
   * 
   * @param node - node to serialize
   * @param requireWellFormed - whether to check conformance
   */
  private _serializeDocumentFragment(node: DocumentFragment,
    requireWellFormed: boolean): string {

    /**
     * 1. Let markup the empty string.
     * 2. For each child child of node, in tree order, run the XML serialization
     * algorithm on the child given namespace, prefix map, a reference to prefix
     * index, and flag require well-formed. Concatenate the result to markup.
     * 3. Return the value of markup.
     */
    let markup = ""
    for (const childNode of node.childNodes) {
      markup += this._serializeNode(childNode, requireWellFormed)
    }
    return markup
  }

  /**
   * Produces an XML serialization of a document type node.
   * 
   * @param node - node to serialize
   * @param requireWellFormed - whether to check conformance
   */
  private _serializeDocumentType(node: DocumentType,
    requireWellFormed: boolean): string {

    /**
     * 1. If the require well-formed flag is true and the node's publicId 
     * attribute contains characters that are not matched by the XML PubidChar
     *  production, then throw an exception; the serialization of this node 
     * would not be a well-formed document type declaration.
     */
    if (requireWellFormed && !xml_isPubidChar(node.publicId)) {
      throw new Error("DocType public identifier does not match PubidChar construct (well-formed required).")
    }

    /**    
     * 2. If the require well-formed flag is true and the node's systemId
     * attribute contains characters that are not matched by the XML Char
     * production or that contains both a """ (U+0022 QUOTATION MARK) and a
     * "'" (U+0027 APOSTROPHE), then throw an exception; the serialization
     * of this node would not be a well-formed document type declaration.
     */
    if (requireWellFormed &&
      (!xml_isLegalChar(node.systemId) ||
        (node.systemId.indexOf('"') !== -1 && node.systemId.indexOf("'") !== -1))) {
      throw new Error("DocType system identifier contains invalid characters (well-formed required).")
    }

    /**
     * 3. Let markup be an empty string.
     * 4. Append the string "<!DOCTYPE" to markup.
     * 5. Append " " (U+0020 SPACE) to markup.
     * 6. Append the value of the node's name attribute to markup. For a node
     * belonging to an HTML document, the value will be all lowercase.
     * 7. If the node's publicId is not the empty string then append the 
     * following, in the order listed, to markup:
     * 7.1. " " (U+0020 SPACE);
     * 7.2. The string "PUBLIC";
     * 7.3. " " (U+0020 SPACE);
     * 7.4. """ (U+0022 QUOTATION MARK);
     * 7.5. The value of the node's publicId attribute;
     * 7.6. """ (U+0022 QUOTATION MARK).
     * 8. If the node's systemId is not the empty string and the node's publicId
     * is set to the empty string, then append the following, in the order
     * listed, to markup:
     * 8.1. " " (U+0020 SPACE);
     * 8.2. The string "SYSTEM".
     * 9. If the node's systemId is not the empty string then append the 
     * following, in the order listed, to markup:
     * 9.2. " " (U+0020 SPACE);
     * 9.3. """ (U+0022 QUOTATION MARK);
     * 9.3. The value of the node's systemId attribute;
     * 9.4. """ (U+0022 QUOTATION MARK).
     * 10. Append ">" (U+003E GREATER-THAN SIGN) to markup.
     * 11. Return the value of markup.
     */
    return node.publicId && node.systemId ?
      "<!DOCTYPE " + node.name + " PUBLIC \"" + node.publicId + "\" \"" + node.systemId + "\">"
      : node.publicId ?
        "<!DOCTYPE " + node.name + " PUBLIC \"" + node.publicId + "\">"
        : node.systemId ?
          "<!DOCTYPE " + node.name + " SYSTEM \"" + node.systemId + "\">"
          :
          "<!DOCTYPE " + node.name + ">"
  }

  /**
   * Produces an XML serialization of a processing instruction node.
   * 
   * @param node - node to serialize
   * @param requireWellFormed - whether to check conformance
   */
  private _serializeProcessingInstruction(node: ProcessingInstruction,
    requireWellFormed: boolean): string {

    /**
     * 1. If the require well-formed flag is set (its value is true), and node's
     * target contains a ":" (U+003A COLON) character or is an ASCII 
     * case-insensitive match for the string "xml", then throw an exception; 
     * the serialization of this node's target would not be well-formed.
     */
    if (requireWellFormed && (node.target.indexOf(":") !== -1 || (/^xml$/i).test(node.target))) {
      throw new Error("Processing instruction target contains invalid characters (well-formed required).")
    }

    /**
     * 2. If the require well-formed flag is set (its value is true), and node's
     * data contains characters that are not matched by the XML Char production
     * or contains the string "?>" (U+003F QUESTION MARK, 
     * U+003E GREATER-THAN SIGN), then throw an exception; the serialization of
     * this node's data would not be well-formed.
     */
    if (requireWellFormed && (!xml_isLegalChar(node.data) ||
      node.data.indexOf("?>") !== -1)) {
      throw new Error("Processing instruction data contains invalid characters (well-formed required).")
    }

    /**
     * 3. Let markup be the concatenation of the following, in the order listed:
     * 3.1. "<?" (U+003C LESS-THAN SIGN, U+003F QUESTION MARK);
     * 3.2. The value of node's target;
     * 3.3. " " (U+0020 SPACE);
     * 3.4. The value of node's data;
     * 3.5. "?>" (U+003F QUESTION MARK, U+003E GREATER-THAN SIGN).
     * 4. Return the value of markup.
     */
    return "<?" + node.target + " " + node.data + "?>"
  }

  /**
   * Produces an XML serialization of a CDATA node.
   * 
   * @param node - node to serialize
   * @param requireWellFormed - whether to check conformance
   */
  private _serializeCData(node: CDATASection, requireWellFormed: boolean): string {

    if (requireWellFormed && (node.data.indexOf("]]>") !== -1)) {
      throw new Error("CDATA contains invalid characters (well-formed required).")
    }

    return "<![CDATA[" + node.data + "]]>"
  }

  /**
  * Produces an XML serialization of the attributes of an element node.
  * 
   * @param node - node to serialize
   * @param requireWellFormed - whether to check conformance
  */
  private _serializeAttributes(node: Element,
    requireWellFormed: boolean): string {

    /**
     * 1. Let result be the empty string.
     * 2. Let localname set be a new empty namespace localname set. This 
     * localname set will contain tuples of unique attribute namespaceURI and 
     * localName pairs, and is populated as each attr is processed. This set is 
     * used to [optionally] enforce the well-formed constraint that an element
     * cannot have two attributes with the same namespaceURI and localName. 
     * This can occur when two otherwise identical attributes on the same 
     * element differ only by their prefix values.
     */
    let result = ""
    const localNameSet: { [key: string]: boolean } | undefined =
      requireWellFormed ? {} : undefined

    /** 
     * 3. Loop: For each attribute attr in element's attributes, in the order 
     * they are specified in the element's attribute list: 
     */
    for (let i = 0; i < node.attributes.length; i++) {
      const attr = node.attributes.item(i)
      if (!attr) continue

      /**
       * 3.1. If the require well-formed flag is set (its value is true), and the 
       * localname set contains a tuple whose values match those of a new tuple 
       * consisting of attr's namespaceURI attribute and localName attribute, 
       * then throw an exception; the serialization of this attr would fail to
       * produce a well-formed element serialization.
       */
      if (requireWellFormed && localNameSet && (attr.localName in localNameSet)) {
        throw new Error("Element contains duplicate attributes (well-formed required).")
      }

      /**
       * 3.2. Create a new tuple consisting of attr's namespaceURI attribute and 
       * localName attribute, and add it to the localname set.
       * 3.3. Let attribute namespace be the value of attr's namespaceURI value.
       * 3.4. Let candidate prefix be null.
       */
      if (requireWellFormed && localNameSet) localNameSet[attr.localName] = true

      /** 3.5. If attribute namespace is not null, then run these sub-steps: */
      /**
       * 3.6. Append a " " (U+0020 SPACE) to result.
       * 3.7. If candidate prefix is not null, then append to result the 
       * concatenation of candidate prefix with ":" (U+003A COLON).
       */
      /**
       * 3.8. If the require well-formed flag is set (its value is true), and 
       * this attr's localName attribute contains the character 
       * ":" (U+003A COLON) or does not match the XML Name production or 
       * equals "xmlns" and attribute namespace is null, then throw an 
       * exception; the serialization of this attr would not be a 
       * well-formed attribute.
       */
      if (requireWellFormed && (attr.localName.indexOf(":") !== -1 ||
        !xml_isName(attr.localName))) {
        throw new Error("Attribute local name contains invalid characters (well-formed required).")
      }

      /**
       * 3.9. Append the following strings to result, in the order listed:
       * 3.9.1. The value of attr's localName;
       * 3.9.2. "="" (U+003D EQUALS SIGN, U+0022 QUOTATION MARK);
       * 3.9.3. The result of serializing an attribute value given attr's value
       * attribute and the require well-formed flag as input;
       * 3.9.4. """ (U+0022 QUOTATION MARK).
       */
      result += " " + attr.localName + "=\"" +
        this._serializeAttributeValue(attr.value, requireWellFormed) + "\""
    }

    /**
     * 4. Return the value of result.
     */
    return result
  }

  /**
   * Produces an XML serialization of an attribute value.
   * 
   * @param value - attribute value
   * @param requireWellFormed - whether to check conformance
   */
  private _serializeAttributeValue(value: string | null, requireWellFormed: boolean): string {
    /**
     * From: https://w3c.github.io/DOM-Parsing/#dfn-serializing-an-attribute-value
     * 
     * 1. If the require well-formed flag is set (its value is true), and 
     * attribute value contains characters that are not matched by the XML Char
     * production, then throw an exception; the serialization of this attribute
     * value would fail to produce a well-formed element serialization.
     */
    if (requireWellFormed && value !== null && !xml_isLegalChar(value)) {
      throw new Error("Invalid characters in attribute value.")
    }

    /**
     * 2. If attribute value is null, then return the empty string.
     */
    if (value === null) return ""

    /**
     * 3. Otherwise, attribute value is a string. Return the value of attribute
     * value, first replacing any occurrences of the following:
     * - "&" with "&amp;"
     * - """ with "&quot;"
     * - "<" with "&lt;"
     * - ">" with "&gt;"
     * NOTE
     * This matches behavior present in browsers, and goes above and beyond the
     * grammar requirement in the XML specification's AttValue production by
     * also replacing ">" characters.
     */
    let result = ""
    for (let i = 0; i < value.length; i++) {
      const c = value[i]
      if (c === "\"")
        result += "&quot;"
      else if (c === "&")
        result += "&amp;"
      else if (c === "<")
        result += "&lt;"
      else if (c === ">")
        result += "&gt;"
      else
        result += c
    }
    return result
  }

}
