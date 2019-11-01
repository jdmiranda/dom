import $$ from '../TestHelpers'

describe('HTMLCollection', () => {

  const doc = $$.dom.createDocument('myns', 'root')

  if (!doc.documentElement)
    throw new Error("documentElement is null")
  const de = doc.documentElement

  const ele1 = doc.createElement('tagged')
  ele1.id = 'ele1'
  const ele2 = doc.createElement('tagged')
  ele2.id = 'ele2'
  const ele3 = doc.createElement('tagged')
  ele3.id = 'ele3'
  de.appendChild(ele1)
  de.appendChild(ele2)
  ele1.appendChild(ele3)
  const list = doc.getElementsByTagName('tagged')

  const htmlDoc = $$.dom.createHTMLDocument('title')

  if (!htmlDoc.documentElement)
    throw new Error("documentElement is null")
  const htmlDE = htmlDoc.documentElement
  const htmlDiv = htmlDoc.createElement('div')
  htmlDiv.setAttribute('att1', 'val1')
  htmlDiv.setAttribute('name', 'my div')
  htmlDiv.setAttribute('att3', 'val3')
  htmlDE.appendChild(htmlDiv)
  const htmlList = htmlDoc.getElementsByTagName('div')

  test('length', () => {
    expect(list.length).toBe(3)
  })

  test('item', () => {
    expect(list.item(0)).toBe(ele1)
    expect(list.item(1)).toBe(ele3)
    expect(list.item(2)).toBe(ele2)
    expect(list.item(-1)).toBeNull()
    expect(list.item(1001)).toBeNull()
  })

  test('namedItem', () => {
    expect(list.namedItem('ele1')).toBe(ele1)
    expect(list.namedItem('ele2')).toBe(ele2)
    expect(list.namedItem('ele3')).toBe(ele3)
    expect(list.namedItem('')).toBeNull()
    expect(list.namedItem('none')).toBeNull()

    expect(htmlList.namedItem('my div')).toBe(htmlDiv)
  })

  test('indexers', () => {
    expect(list[0]).toBe(ele1)
    expect(list[1]).toBe(ele3)
    expect(list[2]).toBe(ele2)
    expect(list['ele1']).toBe(ele1)
    expect(list['ele2']).toBe(ele2)
    expect(list['ele3']).toBe(ele3)
  })

  test('iteration', () => {
    let names = ''
    for (const ele of list) {
      names += '_' + ele.id
    }
    expect(names).toBe('_ele1_ele3_ele2')
  })

  test('_create()', () => {
    const list2 = $$.HTMLCollection._create(de)
    expect(list2._root).toBe(de)
  })

})