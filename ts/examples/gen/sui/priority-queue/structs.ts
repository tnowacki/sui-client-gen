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

/* ============================== Entry =============================== */

export function isEntry(type: string): boolean {
  type = compressSuiType(type)
  return type.startsWith('0x2::priority_queue::Entry<')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface EntryFields<T extends TypeArgument> {
  priority: ToField<'u64'>
  value: ToField<T>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class Entry<T extends TypeArgument> {
  static readonly $typeName = '0x2::priority_queue::Entry'
  static readonly $numTypeParams = 1

  __reifiedFullTypeString = null as unknown as `0x2::priority_queue::Entry<${ToPhantom<T>}>`

  readonly $typeName = Entry.$typeName

  static get bcs() {
    return <T extends BcsType<any>>(T: T) =>
      bcs.struct(`Entry<${T.name}>`, {
        priority: bcs.u64(),
        value: T,
      })
  }

  readonly $typeArg: string

  readonly priority: ToField<'u64'>
  readonly value: ToField<T>

  private constructor(typeArg: string, fields: EntryFields<T>) {
    this.$typeArg = typeArg

    this.priority = fields.priority
    this.value = fields.value
  }

  static new<T extends ReifiedTypeArgument>(
    typeArg: T,
    fields: EntryFields<ToTypeArgument<T>>
  ): Entry<ToTypeArgument<T>> {
    return new Entry(extractType(typeArg), fields)
  }

  static reified<T extends ReifiedTypeArgument>(T: T) {
    return {
      typeName: Entry.$typeName,
      typeArgs: [T],
      fullTypeName: composeSuiType(
        Entry.$typeName,
        ...[extractType(T)]
      ) as `0x2::priority_queue::Entry<${ToPhantomTypeArgument<T>}>`,
      fromFields: (fields: Record<string, any>) => Entry.fromFields(T, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) => Entry.fromFieldsWithTypes(T, item),
      fromBcs: (data: Uint8Array) => Entry.fromBcs(T, data),
      bcs: Entry.bcs(toBcs(T)),
      fromJSONField: (field: any) => Entry.fromJSONField(T, field),
      __class: null as unknown as ReturnType<typeof Entry.new<ToTypeArgument<T>>>,
    }
  }

  static fromFields<T extends ReifiedTypeArgument>(
    typeArg: T,
    fields: Record<string, any>
  ): Entry<ToTypeArgument<T>> {
    return Entry.new(typeArg, {
      priority: decodeFromFields('u64', fields.priority),
      value: decodeFromFields(typeArg, fields.value),
    })
  }

  static fromFieldsWithTypes<T extends ReifiedTypeArgument>(
    typeArg: T,
    item: FieldsWithTypes
  ): Entry<ToTypeArgument<T>> {
    if (!isEntry(item.type)) {
      throw new Error('not a Entry type')
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg])

    return Entry.new(typeArg, {
      priority: decodeFromFieldsWithTypes('u64', item.fields.priority),
      value: decodeFromFieldsWithTypes(typeArg, item.fields.value),
    })
  }

  static fromBcs<T extends ReifiedTypeArgument>(
    typeArg: T,
    data: Uint8Array
  ): Entry<ToTypeArgument<T>> {
    const typeArgs = [typeArg]

    return Entry.fromFields(typeArg, Entry.bcs(toBcs(typeArgs[0])).parse(data))
  }

  toJSONField() {
    return {
      priority: this.priority.toString(),
      value: fieldToJSON<T>(this.$typeArg, this.value),
    }
  }

  toJSON() {
    return { $typeName: this.$typeName, $typeArg: this.$typeArg, ...this.toJSONField() }
  }

  static fromJSONField<T extends ReifiedTypeArgument>(
    typeArg: T,
    field: any
  ): Entry<ToTypeArgument<T>> {
    return Entry.new(typeArg, {
      priority: decodeFromJSONField('u64', field.priority),
      value: decodeFromJSONField(typeArg, field.value),
    })
  }

  static fromJSON<T extends ReifiedTypeArgument>(
    typeArg: T,
    json: Record<string, any>
  ): Entry<ToTypeArgument<T>> {
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

/* ============================== PriorityQueue =============================== */

export function isPriorityQueue(type: string): boolean {
  type = compressSuiType(type)
  return type.startsWith('0x2::priority_queue::PriorityQueue<')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface PriorityQueueFields<T extends TypeArgument> {
  entries: ToField<Vector<Entry<T>>>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class PriorityQueue<T extends TypeArgument> {
  static readonly $typeName = '0x2::priority_queue::PriorityQueue'
  static readonly $numTypeParams = 1

  __reifiedFullTypeString = null as unknown as `0x2::priority_queue::PriorityQueue<${ToPhantom<T>}>`

  readonly $typeName = PriorityQueue.$typeName

  static get bcs() {
    return <T extends BcsType<any>>(T: T) =>
      bcs.struct(`PriorityQueue<${T.name}>`, {
        entries: bcs.vector(Entry.bcs(T)),
      })
  }

  readonly $typeArg: string

  readonly entries: ToField<Vector<Entry<T>>>

  private constructor(typeArg: string, entries: ToField<Vector<Entry<T>>>) {
    this.$typeArg = typeArg

    this.entries = entries
  }

  static new<T extends ReifiedTypeArgument>(
    typeArg: T,
    entries: ToField<Vector<Entry<ToTypeArgument<T>>>>
  ): PriorityQueue<ToTypeArgument<T>> {
    return new PriorityQueue(extractType(typeArg), entries)
  }

  static reified<T extends ReifiedTypeArgument>(T: T) {
    return {
      typeName: PriorityQueue.$typeName,
      typeArgs: [T],
      fullTypeName: composeSuiType(
        PriorityQueue.$typeName,
        ...[extractType(T)]
      ) as `0x2::priority_queue::PriorityQueue<${ToPhantomTypeArgument<T>}>`,
      fromFields: (fields: Record<string, any>) => PriorityQueue.fromFields(T, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) => PriorityQueue.fromFieldsWithTypes(T, item),
      fromBcs: (data: Uint8Array) => PriorityQueue.fromBcs(T, data),
      bcs: PriorityQueue.bcs(toBcs(T)),
      fromJSONField: (field: any) => PriorityQueue.fromJSONField(T, field),
      __class: null as unknown as ReturnType<typeof PriorityQueue.new<ToTypeArgument<T>>>,
    }
  }

  static fromFields<T extends ReifiedTypeArgument>(
    typeArg: T,
    fields: Record<string, any>
  ): PriorityQueue<ToTypeArgument<T>> {
    return PriorityQueue.new(
      typeArg,
      decodeFromFields(reified.vector(Entry.reified(typeArg)), fields.entries)
    )
  }

  static fromFieldsWithTypes<T extends ReifiedTypeArgument>(
    typeArg: T,
    item: FieldsWithTypes
  ): PriorityQueue<ToTypeArgument<T>> {
    if (!isPriorityQueue(item.type)) {
      throw new Error('not a PriorityQueue type')
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg])

    return PriorityQueue.new(
      typeArg,
      decodeFromFieldsWithTypes(reified.vector(Entry.reified(typeArg)), item.fields.entries)
    )
  }

  static fromBcs<T extends ReifiedTypeArgument>(
    typeArg: T,
    data: Uint8Array
  ): PriorityQueue<ToTypeArgument<T>> {
    const typeArgs = [typeArg]

    return PriorityQueue.fromFields(typeArg, PriorityQueue.bcs(toBcs(typeArgs[0])).parse(data))
  }

  toJSONField() {
    return {
      entries: fieldToJSON<Vector<Entry<T>>>(
        `vector<0x2::priority_queue::Entry<${this.$typeArg}>>`,
        this.entries
      ),
    }
  }

  toJSON() {
    return { $typeName: this.$typeName, $typeArg: this.$typeArg, ...this.toJSONField() }
  }

  static fromJSONField<T extends ReifiedTypeArgument>(
    typeArg: T,
    field: any
  ): PriorityQueue<ToTypeArgument<T>> {
    return PriorityQueue.new(
      typeArg,
      decodeFromJSONField(reified.vector(Entry.reified(typeArg)), field.entries)
    )
  }

  static fromJSON<T extends ReifiedTypeArgument>(
    typeArg: T,
    json: Record<string, any>
  ): PriorityQueue<ToTypeArgument<T>> {
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
