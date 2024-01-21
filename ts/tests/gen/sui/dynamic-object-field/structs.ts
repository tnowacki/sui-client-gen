import {
  ReifiedTypeArgument,
  ToField,
  ToPhantomTypeArgument,
  ToTypeArgument,
  TypeArgument,
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

/* ============================== Wrapper =============================== */

export function isWrapper(type: string): boolean {
  type = compressSuiType(type)
  return type.startsWith('0x2::dynamic_object_field::Wrapper<')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface WrapperFields<Name extends TypeArgument> {
  name: ToField<Name>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class Wrapper<Name extends TypeArgument> {
  static readonly $typeName = '0x2::dynamic_object_field::Wrapper'
  static readonly $numTypeParams = 1

  __reifiedFullTypeString =
    null as unknown as `0x2::dynamic_object_field::Wrapper<${ToPhantom<Name>}>`

  readonly $typeName = Wrapper.$typeName

  static get bcs() {
    return <Name extends BcsType<any>>(Name: Name) =>
      bcs.struct(`Wrapper<${Name.name}>`, {
        name: Name,
      })
  }

  readonly $typeArg: string

  readonly name: ToField<Name>

  private constructor(typeArg: string, name: ToField<Name>) {
    this.$typeArg = typeArg

    this.name = name
  }

  static new<Name extends ReifiedTypeArgument>(
    typeArg: Name,
    name: ToField<ToTypeArgument<Name>>
  ): Wrapper<ToTypeArgument<Name>> {
    return new Wrapper(extractType(typeArg), name)
  }

  static reified<Name extends ReifiedTypeArgument>(Name: Name) {
    return {
      typeName: Wrapper.$typeName,
      typeArgs: [Name],
      fullTypeName: composeSuiType(
        Wrapper.$typeName,
        ...[extractType(Name)]
      ) as `0x2::dynamic_object_field::Wrapper<${ToPhantomTypeArgument<Name>}>`,
      fromFields: (fields: Record<string, any>) => Wrapper.fromFields(Name, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) => Wrapper.fromFieldsWithTypes(Name, item),
      fromBcs: (data: Uint8Array) => Wrapper.fromBcs(Name, data),
      bcs: Wrapper.bcs(toBcs(Name)),
      fromJSONField: (field: any) => Wrapper.fromJSONField(Name, field),
      __class: null as unknown as ReturnType<typeof Wrapper.new<ToTypeArgument<Name>>>,
    }
  }

  static fromFields<Name extends ReifiedTypeArgument>(
    typeArg: Name,
    fields: Record<string, any>
  ): Wrapper<ToTypeArgument<Name>> {
    return Wrapper.new(typeArg, decodeFromFields(typeArg, fields.name))
  }

  static fromFieldsWithTypes<Name extends ReifiedTypeArgument>(
    typeArg: Name,
    item: FieldsWithTypes
  ): Wrapper<ToTypeArgument<Name>> {
    if (!isWrapper(item.type)) {
      throw new Error('not a Wrapper type')
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg])

    return Wrapper.new(typeArg, decodeFromFieldsWithTypes(typeArg, item.fields.name))
  }

  static fromBcs<Name extends ReifiedTypeArgument>(
    typeArg: Name,
    data: Uint8Array
  ): Wrapper<ToTypeArgument<Name>> {
    const typeArgs = [typeArg]

    return Wrapper.fromFields(typeArg, Wrapper.bcs(toBcs(typeArgs[0])).parse(data))
  }

  toJSONField() {
    return {
      name: fieldToJSON<Name>(this.$typeArg, this.name),
    }
  }

  toJSON() {
    return { $typeName: this.$typeName, $typeArg: this.$typeArg, ...this.toJSONField() }
  }

  static fromJSONField<Name extends ReifiedTypeArgument>(
    typeArg: Name,
    field: any
  ): Wrapper<ToTypeArgument<Name>> {
    return Wrapper.new(typeArg, decodeFromJSONField(typeArg, field.name))
  }

  static fromJSON<Name extends ReifiedTypeArgument>(
    typeArg: Name,
    json: Record<string, any>
  ): Wrapper<ToTypeArgument<Name>> {
    if (json.$typeName !== Wrapper.$typeName) {
      throw new Error('not a WithTwoGenerics json object')
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(Wrapper.$typeName, extractType(typeArg)),
      [json.$typeArg],
      [typeArg]
    )

    return Wrapper.fromJSONField(typeArg, json)
  }
}
