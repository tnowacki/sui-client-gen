import * as reified from '../../_framework/reified'
import {
  ReifiedTypeArgument,
  ToField,
  ToPhantomTypeArgument,
  ToTypeArgument,
  TypeArgument,
  Vector,
  assertFieldsWithTypesArgsMatch,
  assertReifiedTypeArgsMatch,
  decodeFromFields,
  decodeFromFieldsWithTypes,
  decodeFromJSONField,
  extractType,
  fieldToJSON,
  toBcs,
  ToTypeStr as ToPhantom,
} from '../../_framework/reified'
import { FieldsWithTypes, composeSuiType, compressSuiType } from '../../_framework/util'
import { BcsType, bcs } from '@mysten/bcs'

/* ============================== PriorityQueue =============================== */

export function isPriorityQueue(type: string): boolean {
  type = compressSuiType(type)
  return type.startsWith('0x2::priority_queue::PriorityQueue<')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface PriorityQueueFields<T0 extends TypeArgument> {
  entries: ToField<Vector<Entry<T0>>>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class PriorityQueue<T0 extends TypeArgument> {
  static readonly $typeName = '0x2::priority_queue::PriorityQueue'
  static readonly $numTypeParams = 1

  __reifiedFullTypeString =
    null as unknown as `0x2::priority_queue::PriorityQueue<${ToPhantom<T0>}>`

  readonly $typeName = PriorityQueue.$typeName

  static get bcs() {
    return <T0 extends BcsType<any>>(T0: T0) =>
      bcs.struct(`PriorityQueue<${T0.name}>`, {
        entries: bcs.vector(Entry.bcs(T0)),
      })
  }

  readonly $typeArg: string

  readonly entries: ToField<Vector<Entry<T0>>>

  private constructor(typeArg: string, entries: ToField<Vector<Entry<T0>>>) {
    this.$typeArg = typeArg

    this.entries = entries
  }

  static new<T0 extends ReifiedTypeArgument>(
    typeArg: T0,
    entries: ToField<Vector<Entry<ToTypeArgument<T0>>>>
  ): PriorityQueue<ToTypeArgument<T0>> {
    return new PriorityQueue(extractType(typeArg), entries)
  }

  static reified<T0 extends ReifiedTypeArgument>(T0: T0) {
    return {
      typeName: PriorityQueue.$typeName,
      typeArgs: [T0],
      fullTypeName: composeSuiType(
        PriorityQueue.$typeName,
        ...[extractType(T0)]
      ) as `0x2::priority_queue::PriorityQueue<${ToPhantomTypeArgument<T0>}>`,
      fromFields: (fields: Record<string, any>) => PriorityQueue.fromFields(T0, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) => PriorityQueue.fromFieldsWithTypes(T0, item),
      fromBcs: (data: Uint8Array) => PriorityQueue.fromBcs(T0, data),
      bcs: PriorityQueue.bcs(toBcs(T0)),
      fromJSONField: (field: any) => PriorityQueue.fromJSONField(T0, field),
      __class: null as unknown as ReturnType<typeof PriorityQueue.new<ToTypeArgument<T0>>>,
    }
  }

  static fromFields<T0 extends ReifiedTypeArgument>(
    typeArg: T0,
    fields: Record<string, any>
  ): PriorityQueue<ToTypeArgument<T0>> {
    return PriorityQueue.new(
      typeArg,
      decodeFromFields(reified.vector(Entry.reified(typeArg)), fields.entries)
    )
  }

  static fromFieldsWithTypes<T0 extends ReifiedTypeArgument>(
    typeArg: T0,
    item: FieldsWithTypes
  ): PriorityQueue<ToTypeArgument<T0>> {
    if (!isPriorityQueue(item.type)) {
      throw new Error('not a PriorityQueue type')
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg])

    return PriorityQueue.new(
      typeArg,
      decodeFromFieldsWithTypes(reified.vector(Entry.reified(typeArg)), item.fields.entries)
    )
  }

  static fromBcs<T0 extends ReifiedTypeArgument>(
    typeArg: T0,
    data: Uint8Array
  ): PriorityQueue<ToTypeArgument<T0>> {
    const typeArgs = [typeArg]

    return PriorityQueue.fromFields(typeArg, PriorityQueue.bcs(toBcs(typeArgs[0])).parse(data))
  }

  toJSONField() {
    return {
      entries: fieldToJSON<Vector<Entry<T0>>>(
        `vector<0x2::priority_queue::Entry<${this.$typeArg}>>`,
        this.entries
      ),
    }
  }

  toJSON() {
    return { $typeName: this.$typeName, $typeArg: this.$typeArg, ...this.toJSONField() }
  }

  static fromJSONField<T0 extends ReifiedTypeArgument>(
    typeArg: T0,
    field: any
  ): PriorityQueue<ToTypeArgument<T0>> {
    return PriorityQueue.new(
      typeArg,
      decodeFromJSONField(reified.vector(Entry.reified(typeArg)), field.entries)
    )
  }

  static fromJSON<T0 extends ReifiedTypeArgument>(
    typeArg: T0,
    json: Record<string, any>
  ): PriorityQueue<ToTypeArgument<T0>> {
    if (json.$typeName !== PriorityQueue.$typeName) {
      throw new Error('not a WithTwoGenerics json object')
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(PriorityQueue.$typeName, extractType(typeArg)),
      [json.$typeArg],
      [typeArg]
    )

    return PriorityQueue.fromJSONField(typeArg, json)
  }
}

/* ============================== Entry =============================== */

export function isEntry(type: string): boolean {
  type = compressSuiType(type)
  return type.startsWith('0x2::priority_queue::Entry<')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface EntryFields<T0 extends TypeArgument> {
  priority: ToField<'u64'>
  value: ToField<T0>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class Entry<T0 extends TypeArgument> {
  static readonly $typeName = '0x2::priority_queue::Entry'
  static readonly $numTypeParams = 1

  __reifiedFullTypeString = null as unknown as `0x2::priority_queue::Entry<${ToPhantom<T0>}>`

  readonly $typeName = Entry.$typeName

  static get bcs() {
    return <T0 extends BcsType<any>>(T0: T0) =>
      bcs.struct(`Entry<${T0.name}>`, {
        priority: bcs.u64(),
        value: T0,
      })
  }

  readonly $typeArg: string

  readonly priority: ToField<'u64'>
  readonly value: ToField<T0>

  private constructor(typeArg: string, fields: EntryFields<T0>) {
    this.$typeArg = typeArg

    this.priority = fields.priority
    this.value = fields.value
  }

  static new<T0 extends ReifiedTypeArgument>(
    typeArg: T0,
    fields: EntryFields<ToTypeArgument<T0>>
  ): Entry<ToTypeArgument<T0>> {
    return new Entry(extractType(typeArg), fields)
  }

  static reified<T0 extends ReifiedTypeArgument>(T0: T0) {
    return {
      typeName: Entry.$typeName,
      typeArgs: [T0],
      fullTypeName: composeSuiType(
        Entry.$typeName,
        ...[extractType(T0)]
      ) as `0x2::priority_queue::Entry<${ToPhantomTypeArgument<T0>}>`,
      fromFields: (fields: Record<string, any>) => Entry.fromFields(T0, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) => Entry.fromFieldsWithTypes(T0, item),
      fromBcs: (data: Uint8Array) => Entry.fromBcs(T0, data),
      bcs: Entry.bcs(toBcs(T0)),
      fromJSONField: (field: any) => Entry.fromJSONField(T0, field),
      __class: null as unknown as ReturnType<typeof Entry.new<ToTypeArgument<T0>>>,
    }
  }

  static fromFields<T0 extends ReifiedTypeArgument>(
    typeArg: T0,
    fields: Record<string, any>
  ): Entry<ToTypeArgument<T0>> {
    return Entry.new(typeArg, {
      priority: decodeFromFields('u64', fields.priority),
      value: decodeFromFields(typeArg, fields.value),
    })
  }

  static fromFieldsWithTypes<T0 extends ReifiedTypeArgument>(
    typeArg: T0,
    item: FieldsWithTypes
  ): Entry<ToTypeArgument<T0>> {
    if (!isEntry(item.type)) {
      throw new Error('not a Entry type')
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg])

    return Entry.new(typeArg, {
      priority: decodeFromFieldsWithTypes('u64', item.fields.priority),
      value: decodeFromFieldsWithTypes(typeArg, item.fields.value),
    })
  }

  static fromBcs<T0 extends ReifiedTypeArgument>(
    typeArg: T0,
    data: Uint8Array
  ): Entry<ToTypeArgument<T0>> {
    const typeArgs = [typeArg]

    return Entry.fromFields(typeArg, Entry.bcs(toBcs(typeArgs[0])).parse(data))
  }

  toJSONField() {
    return {
      priority: this.priority.toString(),
      value: fieldToJSON<T0>(this.$typeArg, this.value),
    }
  }

  toJSON() {
    return { $typeName: this.$typeName, $typeArg: this.$typeArg, ...this.toJSONField() }
  }

  static fromJSONField<T0 extends ReifiedTypeArgument>(
    typeArg: T0,
    field: any
  ): Entry<ToTypeArgument<T0>> {
    return Entry.new(typeArg, {
      priority: decodeFromJSONField('u64', field.priority),
      value: decodeFromJSONField(typeArg, field.value),
    })
  }

  static fromJSON<T0 extends ReifiedTypeArgument>(
    typeArg: T0,
    json: Record<string, any>
  ): Entry<ToTypeArgument<T0>> {
    if (json.$typeName !== Entry.$typeName) {
      throw new Error('not a WithTwoGenerics json object')
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(Entry.$typeName, extractType(typeArg)),
      [json.$typeArg],
      [typeArg]
    )

    return Entry.fromJSONField(typeArg, json)
  }
}
