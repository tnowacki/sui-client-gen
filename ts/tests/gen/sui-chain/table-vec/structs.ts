import {
  PhantomTypeArgument,
  ReifiedPhantomTypeArgument,
  ToField,
  ToPhantomTypeArgument,
  ToTypeArgument,
  assertFieldsWithTypesArgsMatch,
  assertReifiedTypeArgsMatch,
  decodeFromFields,
  decodeFromFieldsWithTypes,
  decodeFromJSONField,
  extractType,
} from '../../_framework/reified'
import { FieldsWithTypes, composeSuiType, compressSuiType } from '../../_framework/util'
import { Table } from '../table/structs'
import { bcs } from '@mysten/bcs'

/* ============================== TableVec =============================== */

export function isTableVec(type: string): boolean {
  type = compressSuiType(type)
  return type.startsWith('0x2::table_vec::TableVec<')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface TableVecFields<T0 extends PhantomTypeArgument> {
  contents: ToField<Table<'u64', T0>>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class TableVec<T0 extends PhantomTypeArgument> {
  static readonly $typeName = '0x2::table_vec::TableVec'
  static readonly $numTypeParams = 1

  __reifiedFullTypeString = null as unknown as `0x2::table_vec::TableVec<${T0}>`

  readonly $typeName = TableVec.$typeName

  static get bcs() {
    return bcs.struct('TableVec', {
      contents: Table.bcs,
    })
  }

  readonly $typeArg: string

  readonly contents: ToField<Table<'u64', T0>>

  private constructor(typeArg: string, contents: ToField<Table<'u64', T0>>) {
    this.$typeArg = typeArg

    this.contents = contents
  }

  static new<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    contents: ToField<Table<'u64', ToPhantomTypeArgument<T0>>>
  ): TableVec<ToPhantomTypeArgument<T0>> {
    return new TableVec(extractType(typeArg), contents)
  }

  static reified<T0 extends ReifiedPhantomTypeArgument>(T0: T0) {
    return {
      typeName: TableVec.$typeName,
      typeArgs: [T0],
      fullTypeName: composeSuiType(
        TableVec.$typeName,
        ...[extractType(T0)]
      ) as `0x2::table_vec::TableVec<${ToPhantomTypeArgument<T0>}>`,
      fromFields: (fields: Record<string, any>) => TableVec.fromFields(T0, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) => TableVec.fromFieldsWithTypes(T0, item),
      fromBcs: (data: Uint8Array) => TableVec.fromBcs(T0, data),
      bcs: TableVec.bcs,
      fromJSONField: (field: any) => TableVec.fromJSONField(T0, field),
      __class: null as unknown as ReturnType<typeof TableVec.new<ToTypeArgument<T0>>>,
    }
  }

  static fromFields<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    fields: Record<string, any>
  ): TableVec<ToPhantomTypeArgument<T0>> {
    return TableVec.new(typeArg, decodeFromFields(Table.reified('u64', typeArg), fields.contents))
  }

  static fromFieldsWithTypes<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    item: FieldsWithTypes
  ): TableVec<ToPhantomTypeArgument<T0>> {
    if (!isTableVec(item.type)) {
      throw new Error('not a TableVec type')
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg])

    return TableVec.new(
      typeArg,
      decodeFromFieldsWithTypes(Table.reified('u64', typeArg), item.fields.contents)
    )
  }

  static fromBcs<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    data: Uint8Array
  ): TableVec<ToPhantomTypeArgument<T0>> {
    return TableVec.fromFields(typeArg, TableVec.bcs.parse(data))
  }

  toJSONField() {
    return {
      contents: this.contents.toJSONField(),
    }
  }

  toJSON() {
    return { $typeName: this.$typeName, $typeArg: this.$typeArg, ...this.toJSONField() }
  }

  static fromJSONField<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    field: any
  ): TableVec<ToPhantomTypeArgument<T0>> {
    return TableVec.new(typeArg, decodeFromJSONField(Table.reified('u64', typeArg), field.contents))
  }

  static fromJSON<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    json: Record<string, any>
  ): TableVec<ToPhantomTypeArgument<T0>> {
    if (json.$typeName !== TableVec.$typeName) {
      throw new Error('not a WithTwoGenerics json object')
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(TableVec.$typeName, extractType(typeArg)),
      [json.$typeArg],
      [typeArg]
    )

    return TableVec.fromJSONField(typeArg, json)
  }
}
