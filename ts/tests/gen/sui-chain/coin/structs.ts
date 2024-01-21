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
  fieldToJSON,
} from '../../_framework/reified'
import { FieldsWithTypes, composeSuiType, compressSuiType } from '../../_framework/util'
import { String as String1 } from '../../move-stdlib-chain/ascii/structs'
import { Option } from '../../move-stdlib-chain/option/structs'
import { String } from '../../move-stdlib-chain/string/structs'
import { Balance, Supply } from '../balance/structs'
import { UID } from '../object/structs'
import { Url } from '../url/structs'
import { bcs } from '@mysten/bcs'
import { SuiClient, SuiParsedData } from '@mysten/sui.js/client'

/* ============================== Coin =============================== */

export function isCoin(type: string): boolean {
  type = compressSuiType(type)
  return type.startsWith('0x2::coin::Coin<')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface CoinFields<T0 extends PhantomTypeArgument> {
  id: ToField<UID>
  balance: ToField<Balance<T0>>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class Coin<T0 extends PhantomTypeArgument> {
  static readonly $typeName = '0x2::coin::Coin'
  static readonly $numTypeParams = 1

  __reifiedFullTypeString = null as unknown as `0x2::coin::Coin<${T0}>`

  readonly $typeName = Coin.$typeName

  static get bcs() {
    return bcs.struct('Coin', {
      id: UID.bcs,
      balance: Balance.bcs,
    })
  }

  readonly $typeArg: string

  readonly id: ToField<UID>
  readonly balance: ToField<Balance<T0>>

  private constructor(typeArg: string, fields: CoinFields<T0>) {
    this.$typeArg = typeArg

    this.id = fields.id
    this.balance = fields.balance
  }

  static new<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    fields: CoinFields<ToPhantomTypeArgument<T0>>
  ): Coin<ToPhantomTypeArgument<T0>> {
    return new Coin(extractType(typeArg), fields)
  }

  static reified<T0 extends ReifiedPhantomTypeArgument>(T0: T0) {
    return {
      typeName: Coin.$typeName,
      typeArgs: [T0],
      fullTypeName: composeSuiType(
        Coin.$typeName,
        ...[extractType(T0)]
      ) as `0x2::coin::Coin<${ToPhantomTypeArgument<T0>}>`,
      fromFields: (fields: Record<string, any>) => Coin.fromFields(T0, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) => Coin.fromFieldsWithTypes(T0, item),
      fromBcs: (data: Uint8Array) => Coin.fromBcs(T0, data),
      bcs: Coin.bcs,
      fromJSONField: (field: any) => Coin.fromJSONField(T0, field),
      __class: null as unknown as ReturnType<typeof Coin.new<ToTypeArgument<T0>>>,
    }
  }

  static fromFields<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    fields: Record<string, any>
  ): Coin<ToPhantomTypeArgument<T0>> {
    return Coin.new(typeArg, {
      id: decodeFromFields(UID.reified(), fields.id),
      balance: decodeFromFields(Balance.reified(typeArg), fields.balance),
    })
  }

  static fromFieldsWithTypes<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    item: FieldsWithTypes
  ): Coin<ToPhantomTypeArgument<T0>> {
    if (!isCoin(item.type)) {
      throw new Error('not a Coin type')
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg])

    return Coin.new(typeArg, {
      id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id),
      balance: decodeFromFieldsWithTypes(Balance.reified(typeArg), item.fields.balance),
    })
  }

  static fromBcs<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    data: Uint8Array
  ): Coin<ToPhantomTypeArgument<T0>> {
    return Coin.fromFields(typeArg, Coin.bcs.parse(data))
  }

  toJSONField() {
    return {
      id: this.id,
      balance: this.balance.toJSONField(),
    }
  }

  toJSON() {
    return { $typeName: this.$typeName, $typeArg: this.$typeArg, ...this.toJSONField() }
  }

  static fromJSONField<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    field: any
  ): Coin<ToPhantomTypeArgument<T0>> {
    return Coin.new(typeArg, {
      id: decodeFromJSONField(UID.reified(), field.id),
      balance: decodeFromJSONField(Balance.reified(typeArg), field.balance),
    })
  }

  static fromJSON<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    json: Record<string, any>
  ): Coin<ToPhantomTypeArgument<T0>> {
    if (json.$typeName !== Coin.$typeName) {
      throw new Error('not a WithTwoGenerics json object')
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(Coin.$typeName, extractType(typeArg)),
      [json.$typeArg],
      [typeArg]
    )

    return Coin.fromJSONField(typeArg, json)
  }

  static fromSuiParsedData<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    content: SuiParsedData
  ): Coin<ToPhantomTypeArgument<T0>> {
    if (content.dataType !== 'moveObject') {
      throw new Error('not an object')
    }
    if (!isCoin(content.type)) {
      throw new Error(`object at ${(content.fields as any).id} is not a Coin object`)
    }
    return Coin.fromFieldsWithTypes(typeArg, content)
  }

  static async fetch<T0 extends ReifiedPhantomTypeArgument>(
    client: SuiClient,
    typeArg: T0,
    id: string
  ): Promise<Coin<ToPhantomTypeArgument<T0>>> {
    const res = await client.getObject({ id, options: { showContent: true } })
    if (res.error) {
      throw new Error(`error fetching Coin object at id ${id}: ${res.error.code}`)
    }
    if (res.data?.content?.dataType !== 'moveObject' || !isCoin(res.data.content.type)) {
      throw new Error(`object at id ${id} is not a Coin object`)
    }
    return Coin.fromFieldsWithTypes(typeArg, res.data.content)
  }
}

/* ============================== CoinMetadata =============================== */

export function isCoinMetadata(type: string): boolean {
  type = compressSuiType(type)
  return type.startsWith('0x2::coin::CoinMetadata<')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface CoinMetadataFields<T0 extends PhantomTypeArgument> {
  id: ToField<UID>
  decimals: ToField<'u8'>
  name: ToField<String>
  symbol: ToField<String1>
  description: ToField<String>
  iconUrl: ToField<Option<Url>>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class CoinMetadata<T0 extends PhantomTypeArgument> {
  static readonly $typeName = '0x2::coin::CoinMetadata'
  static readonly $numTypeParams = 1

  __reifiedFullTypeString = null as unknown as `0x2::coin::CoinMetadata<${T0}>`

  readonly $typeName = CoinMetadata.$typeName

  static get bcs() {
    return bcs.struct('CoinMetadata', {
      id: UID.bcs,
      decimals: bcs.u8(),
      name: String.bcs,
      symbol: String1.bcs,
      description: String.bcs,
      icon_url: Option.bcs(Url.bcs),
    })
  }

  readonly $typeArg: string

  readonly id: ToField<UID>
  readonly decimals: ToField<'u8'>
  readonly name: ToField<String>
  readonly symbol: ToField<String1>
  readonly description: ToField<String>
  readonly iconUrl: ToField<Option<Url>>

  private constructor(typeArg: string, fields: CoinMetadataFields<T0>) {
    this.$typeArg = typeArg

    this.id = fields.id
    this.decimals = fields.decimals
    this.name = fields.name
    this.symbol = fields.symbol
    this.description = fields.description
    this.iconUrl = fields.iconUrl
  }

  static new<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    fields: CoinMetadataFields<ToPhantomTypeArgument<T0>>
  ): CoinMetadata<ToPhantomTypeArgument<T0>> {
    return new CoinMetadata(extractType(typeArg), fields)
  }

  static reified<T0 extends ReifiedPhantomTypeArgument>(T0: T0) {
    return {
      typeName: CoinMetadata.$typeName,
      typeArgs: [T0],
      fullTypeName: composeSuiType(
        CoinMetadata.$typeName,
        ...[extractType(T0)]
      ) as `0x2::coin::CoinMetadata<${ToPhantomTypeArgument<T0>}>`,
      fromFields: (fields: Record<string, any>) => CoinMetadata.fromFields(T0, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) => CoinMetadata.fromFieldsWithTypes(T0, item),
      fromBcs: (data: Uint8Array) => CoinMetadata.fromBcs(T0, data),
      bcs: CoinMetadata.bcs,
      fromJSONField: (field: any) => CoinMetadata.fromJSONField(T0, field),
      __class: null as unknown as ReturnType<typeof CoinMetadata.new<ToTypeArgument<T0>>>,
    }
  }

  static fromFields<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    fields: Record<string, any>
  ): CoinMetadata<ToPhantomTypeArgument<T0>> {
    return CoinMetadata.new(typeArg, {
      id: decodeFromFields(UID.reified(), fields.id),
      decimals: decodeFromFields('u8', fields.decimals),
      name: decodeFromFields(String.reified(), fields.name),
      symbol: decodeFromFields(String1.reified(), fields.symbol),
      description: decodeFromFields(String.reified(), fields.description),
      iconUrl: decodeFromFields(Option.reified(Url.reified()), fields.icon_url),
    })
  }

  static fromFieldsWithTypes<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    item: FieldsWithTypes
  ): CoinMetadata<ToPhantomTypeArgument<T0>> {
    if (!isCoinMetadata(item.type)) {
      throw new Error('not a CoinMetadata type')
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg])

    return CoinMetadata.new(typeArg, {
      id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id),
      decimals: decodeFromFieldsWithTypes('u8', item.fields.decimals),
      name: decodeFromFieldsWithTypes(String.reified(), item.fields.name),
      symbol: decodeFromFieldsWithTypes(String1.reified(), item.fields.symbol),
      description: decodeFromFieldsWithTypes(String.reified(), item.fields.description),
      iconUrl: decodeFromFieldsWithTypes(Option.reified(Url.reified()), item.fields.icon_url),
    })
  }

  static fromBcs<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    data: Uint8Array
  ): CoinMetadata<ToPhantomTypeArgument<T0>> {
    return CoinMetadata.fromFields(typeArg, CoinMetadata.bcs.parse(data))
  }

  toJSONField() {
    return {
      id: this.id,
      decimals: this.decimals,
      name: this.name,
      symbol: this.symbol,
      description: this.description,
      iconUrl: fieldToJSON<Option<Url>>(`0x1::option::Option<0x2::url::Url>`, this.iconUrl),
    }
  }

  toJSON() {
    return { $typeName: this.$typeName, $typeArg: this.$typeArg, ...this.toJSONField() }
  }

  static fromJSONField<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    field: any
  ): CoinMetadata<ToPhantomTypeArgument<T0>> {
    return CoinMetadata.new(typeArg, {
      id: decodeFromJSONField(UID.reified(), field.id),
      decimals: decodeFromJSONField('u8', field.decimals),
      name: decodeFromJSONField(String.reified(), field.name),
      symbol: decodeFromJSONField(String1.reified(), field.symbol),
      description: decodeFromJSONField(String.reified(), field.description),
      iconUrl: decodeFromJSONField(Option.reified(Url.reified()), field.iconUrl),
    })
  }

  static fromJSON<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    json: Record<string, any>
  ): CoinMetadata<ToPhantomTypeArgument<T0>> {
    if (json.$typeName !== CoinMetadata.$typeName) {
      throw new Error('not a WithTwoGenerics json object')
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(CoinMetadata.$typeName, extractType(typeArg)),
      [json.$typeArg],
      [typeArg]
    )

    return CoinMetadata.fromJSONField(typeArg, json)
  }

  static fromSuiParsedData<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    content: SuiParsedData
  ): CoinMetadata<ToPhantomTypeArgument<T0>> {
    if (content.dataType !== 'moveObject') {
      throw new Error('not an object')
    }
    if (!isCoinMetadata(content.type)) {
      throw new Error(`object at ${(content.fields as any).id} is not a CoinMetadata object`)
    }
    return CoinMetadata.fromFieldsWithTypes(typeArg, content)
  }

  static async fetch<T0 extends ReifiedPhantomTypeArgument>(
    client: SuiClient,
    typeArg: T0,
    id: string
  ): Promise<CoinMetadata<ToPhantomTypeArgument<T0>>> {
    const res = await client.getObject({ id, options: { showContent: true } })
    if (res.error) {
      throw new Error(`error fetching CoinMetadata object at id ${id}: ${res.error.code}`)
    }
    if (res.data?.content?.dataType !== 'moveObject' || !isCoinMetadata(res.data.content.type)) {
      throw new Error(`object at id ${id} is not a CoinMetadata object`)
    }
    return CoinMetadata.fromFieldsWithTypes(typeArg, res.data.content)
  }
}

/* ============================== TreasuryCap =============================== */

export function isTreasuryCap(type: string): boolean {
  type = compressSuiType(type)
  return type.startsWith('0x2::coin::TreasuryCap<')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface TreasuryCapFields<T0 extends PhantomTypeArgument> {
  id: ToField<UID>
  totalSupply: ToField<Supply<T0>>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class TreasuryCap<T0 extends PhantomTypeArgument> {
  static readonly $typeName = '0x2::coin::TreasuryCap'
  static readonly $numTypeParams = 1

  __reifiedFullTypeString = null as unknown as `0x2::coin::TreasuryCap<${T0}>`

  readonly $typeName = TreasuryCap.$typeName

  static get bcs() {
    return bcs.struct('TreasuryCap', {
      id: UID.bcs,
      total_supply: Supply.bcs,
    })
  }

  readonly $typeArg: string

  readonly id: ToField<UID>
  readonly totalSupply: ToField<Supply<T0>>

  private constructor(typeArg: string, fields: TreasuryCapFields<T0>) {
    this.$typeArg = typeArg

    this.id = fields.id
    this.totalSupply = fields.totalSupply
  }

  static new<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    fields: TreasuryCapFields<ToPhantomTypeArgument<T0>>
  ): TreasuryCap<ToPhantomTypeArgument<T0>> {
    return new TreasuryCap(extractType(typeArg), fields)
  }

  static reified<T0 extends ReifiedPhantomTypeArgument>(T0: T0) {
    return {
      typeName: TreasuryCap.$typeName,
      typeArgs: [T0],
      fullTypeName: composeSuiType(
        TreasuryCap.$typeName,
        ...[extractType(T0)]
      ) as `0x2::coin::TreasuryCap<${ToPhantomTypeArgument<T0>}>`,
      fromFields: (fields: Record<string, any>) => TreasuryCap.fromFields(T0, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) => TreasuryCap.fromFieldsWithTypes(T0, item),
      fromBcs: (data: Uint8Array) => TreasuryCap.fromBcs(T0, data),
      bcs: TreasuryCap.bcs,
      fromJSONField: (field: any) => TreasuryCap.fromJSONField(T0, field),
      __class: null as unknown as ReturnType<typeof TreasuryCap.new<ToTypeArgument<T0>>>,
    }
  }

  static fromFields<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    fields: Record<string, any>
  ): TreasuryCap<ToPhantomTypeArgument<T0>> {
    return TreasuryCap.new(typeArg, {
      id: decodeFromFields(UID.reified(), fields.id),
      totalSupply: decodeFromFields(Supply.reified(typeArg), fields.total_supply),
    })
  }

  static fromFieldsWithTypes<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    item: FieldsWithTypes
  ): TreasuryCap<ToPhantomTypeArgument<T0>> {
    if (!isTreasuryCap(item.type)) {
      throw new Error('not a TreasuryCap type')
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg])

    return TreasuryCap.new(typeArg, {
      id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id),
      totalSupply: decodeFromFieldsWithTypes(Supply.reified(typeArg), item.fields.total_supply),
    })
  }

  static fromBcs<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    data: Uint8Array
  ): TreasuryCap<ToPhantomTypeArgument<T0>> {
    return TreasuryCap.fromFields(typeArg, TreasuryCap.bcs.parse(data))
  }

  toJSONField() {
    return {
      id: this.id,
      totalSupply: this.totalSupply.toJSONField(),
    }
  }

  toJSON() {
    return { $typeName: this.$typeName, $typeArg: this.$typeArg, ...this.toJSONField() }
  }

  static fromJSONField<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    field: any
  ): TreasuryCap<ToPhantomTypeArgument<T0>> {
    return TreasuryCap.new(typeArg, {
      id: decodeFromJSONField(UID.reified(), field.id),
      totalSupply: decodeFromJSONField(Supply.reified(typeArg), field.totalSupply),
    })
  }

  static fromJSON<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    json: Record<string, any>
  ): TreasuryCap<ToPhantomTypeArgument<T0>> {
    if (json.$typeName !== TreasuryCap.$typeName) {
      throw new Error('not a WithTwoGenerics json object')
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(TreasuryCap.$typeName, extractType(typeArg)),
      [json.$typeArg],
      [typeArg]
    )

    return TreasuryCap.fromJSONField(typeArg, json)
  }

  static fromSuiParsedData<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    content: SuiParsedData
  ): TreasuryCap<ToPhantomTypeArgument<T0>> {
    if (content.dataType !== 'moveObject') {
      throw new Error('not an object')
    }
    if (!isTreasuryCap(content.type)) {
      throw new Error(`object at ${(content.fields as any).id} is not a TreasuryCap object`)
    }
    return TreasuryCap.fromFieldsWithTypes(typeArg, content)
  }

  static async fetch<T0 extends ReifiedPhantomTypeArgument>(
    client: SuiClient,
    typeArg: T0,
    id: string
  ): Promise<TreasuryCap<ToPhantomTypeArgument<T0>>> {
    const res = await client.getObject({ id, options: { showContent: true } })
    if (res.error) {
      throw new Error(`error fetching TreasuryCap object at id ${id}: ${res.error.code}`)
    }
    if (res.data?.content?.dataType !== 'moveObject' || !isTreasuryCap(res.data.content.type)) {
      throw new Error(`object at id ${id} is not a TreasuryCap object`)
    }
    return TreasuryCap.fromFieldsWithTypes(typeArg, res.data.content)
  }
}

/* ============================== CurrencyCreated =============================== */

export function isCurrencyCreated(type: string): boolean {
  type = compressSuiType(type)
  return type.startsWith('0x2::coin::CurrencyCreated<')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface CurrencyCreatedFields<T0 extends PhantomTypeArgument> {
  decimals: ToField<'u8'>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class CurrencyCreated<T0 extends PhantomTypeArgument> {
  static readonly $typeName = '0x2::coin::CurrencyCreated'
  static readonly $numTypeParams = 1

  __reifiedFullTypeString = null as unknown as `0x2::coin::CurrencyCreated<${T0}>`

  readonly $typeName = CurrencyCreated.$typeName

  static get bcs() {
    return bcs.struct('CurrencyCreated', {
      decimals: bcs.u8(),
    })
  }

  readonly $typeArg: string

  readonly decimals: ToField<'u8'>

  private constructor(typeArg: string, decimals: ToField<'u8'>) {
    this.$typeArg = typeArg

    this.decimals = decimals
  }

  static new<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    decimals: ToField<'u8'>
  ): CurrencyCreated<ToPhantomTypeArgument<T0>> {
    return new CurrencyCreated(extractType(typeArg), decimals)
  }

  static reified<T0 extends ReifiedPhantomTypeArgument>(T0: T0) {
    return {
      typeName: CurrencyCreated.$typeName,
      typeArgs: [T0],
      fullTypeName: composeSuiType(
        CurrencyCreated.$typeName,
        ...[extractType(T0)]
      ) as `0x2::coin::CurrencyCreated<${ToPhantomTypeArgument<T0>}>`,
      fromFields: (fields: Record<string, any>) => CurrencyCreated.fromFields(T0, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) => CurrencyCreated.fromFieldsWithTypes(T0, item),
      fromBcs: (data: Uint8Array) => CurrencyCreated.fromBcs(T0, data),
      bcs: CurrencyCreated.bcs,
      fromJSONField: (field: any) => CurrencyCreated.fromJSONField(T0, field),
      __class: null as unknown as ReturnType<typeof CurrencyCreated.new<ToTypeArgument<T0>>>,
    }
  }

  static fromFields<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    fields: Record<string, any>
  ): CurrencyCreated<ToPhantomTypeArgument<T0>> {
    return CurrencyCreated.new(typeArg, decodeFromFields('u8', fields.decimals))
  }

  static fromFieldsWithTypes<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    item: FieldsWithTypes
  ): CurrencyCreated<ToPhantomTypeArgument<T0>> {
    if (!isCurrencyCreated(item.type)) {
      throw new Error('not a CurrencyCreated type')
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg])

    return CurrencyCreated.new(typeArg, decodeFromFieldsWithTypes('u8', item.fields.decimals))
  }

  static fromBcs<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    data: Uint8Array
  ): CurrencyCreated<ToPhantomTypeArgument<T0>> {
    return CurrencyCreated.fromFields(typeArg, CurrencyCreated.bcs.parse(data))
  }

  toJSONField() {
    return {
      decimals: this.decimals,
    }
  }

  toJSON() {
    return { $typeName: this.$typeName, $typeArg: this.$typeArg, ...this.toJSONField() }
  }

  static fromJSONField<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    field: any
  ): CurrencyCreated<ToPhantomTypeArgument<T0>> {
    return CurrencyCreated.new(typeArg, decodeFromJSONField('u8', field.decimals))
  }

  static fromJSON<T0 extends ReifiedPhantomTypeArgument>(
    typeArg: T0,
    json: Record<string, any>
  ): CurrencyCreated<ToPhantomTypeArgument<T0>> {
    if (json.$typeName !== CurrencyCreated.$typeName) {
      throw new Error('not a WithTwoGenerics json object')
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(CurrencyCreated.$typeName, extractType(typeArg)),
      [json.$typeArg],
      [typeArg]
    )

    return CurrencyCreated.fromJSONField(typeArg, json)
  }
}
