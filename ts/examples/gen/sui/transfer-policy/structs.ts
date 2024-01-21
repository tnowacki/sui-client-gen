import { TypeName } from '../../_dependencies/source/0x1/type-name/structs'
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
  ToTypeStr as ToPhantom,
} from '../../_framework/reified'
import { FieldsWithTypes, composeSuiType, compressSuiType } from '../../_framework/util'
import { Balance } from '../balance/structs'
import { ID, UID } from '../object/structs'
import { SUI } from '../sui/structs'
import { VecSet } from '../vec-set/structs'
import { bcs } from '@mysten/bcs'
import { SuiClient, SuiParsedData } from '@mysten/sui.js/client'

/* ============================== RuleKey =============================== */

export function isRuleKey(type: string): boolean {
  type = compressSuiType(type)
  return type.startsWith('0x2::transfer_policy::RuleKey<')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface RuleKeyFields<T extends PhantomTypeArgument> {
  dummyField: ToField<'bool'>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class RuleKey<T extends PhantomTypeArgument> {
  static readonly $typeName = '0x2::transfer_policy::RuleKey'
  static readonly $numTypeParams = 1

  __reifiedFullTypeString = null as unknown as `0x2::transfer_policy::RuleKey<${T}>`

  readonly $typeName = RuleKey.$typeName

  static get bcs() {
    return bcs.struct('RuleKey', {
      dummy_field: bcs.bool(),
    })
  }

  readonly $typeArg: string

  readonly dummyField: ToField<'bool'>

  private constructor(typeArg: string, dummyField: ToField<'bool'>) {
    this.$typeArg = typeArg

    this.dummyField = dummyField
  }

  static new<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    dummyField: ToField<'bool'>
  ): RuleKey<ToPhantomTypeArgument<T>> {
    return new RuleKey(extractType(typeArg), dummyField)
  }

  static reified<T extends ReifiedPhantomTypeArgument>(T: T) {
    return {
      typeName: RuleKey.$typeName,
      typeArgs: [T],
      fullTypeName: composeSuiType(
        RuleKey.$typeName,
        ...[extractType(T)]
      ) as `0x2::transfer_policy::RuleKey<${ToPhantomTypeArgument<T>}>`,
      fromFields: (fields: Record<string, any>) => RuleKey.fromFields(T, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) => RuleKey.fromFieldsWithTypes(T, item),
      fromBcs: (data: Uint8Array) => RuleKey.fromBcs(T, data),
      bcs: RuleKey.bcs,
      fromJSONField: (field: any) => RuleKey.fromJSONField(T, field),
      __class: null as unknown as ReturnType<typeof RuleKey.new<ToTypeArgument<T>>>,
    }
  }

  static fromFields<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    fields: Record<string, any>
  ): RuleKey<ToPhantomTypeArgument<T>> {
    return RuleKey.new(typeArg, decodeFromFields('bool', fields.dummy_field))
  }

  static fromFieldsWithTypes<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    item: FieldsWithTypes
  ): RuleKey<ToPhantomTypeArgument<T>> {
    if (!isRuleKey(item.type)) {
      throw new Error('not a RuleKey type')
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg])

    return RuleKey.new(typeArg, decodeFromFieldsWithTypes('bool', item.fields.dummy_field))
  }

  static fromBcs<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    data: Uint8Array
  ): RuleKey<ToPhantomTypeArgument<T>> {
    return RuleKey.fromFields(typeArg, RuleKey.bcs.parse(data))
  }

  toJSONField() {
    return {
      dummyField: this.dummyField,
    }
  }

  toJSON() {
    return { $typeName: this.$typeName, $typeArg: this.$typeArg, ...this.toJSONField() }
  }

  static fromJSONField<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    field: any
  ): RuleKey<ToPhantomTypeArgument<T>> {
    return RuleKey.new(typeArg, decodeFromJSONField('bool', field.dummyField))
  }

  static fromJSON<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    json: Record<string, any>
  ): RuleKey<ToPhantomTypeArgument<T>> {
    if (json.$typeName !== RuleKey.$typeName) {
      throw new Error('not a WithTwoGenerics json object')
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(RuleKey.$typeName, extractType(typeArg)),
      [json.$typeArg],
      [typeArg]
    )

    return RuleKey.fromJSONField(typeArg, json)
  }
}

/* ============================== TransferPolicy =============================== */

export function isTransferPolicy(type: string): boolean {
  type = compressSuiType(type)
  return type.startsWith('0x2::transfer_policy::TransferPolicy<')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface TransferPolicyFields<T extends PhantomTypeArgument> {
  id: ToField<UID>
  balance: ToField<Balance<ToPhantom<SUI>>>
  rules: ToField<VecSet<TypeName>>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class TransferPolicy<T extends PhantomTypeArgument> {
  static readonly $typeName = '0x2::transfer_policy::TransferPolicy'
  static readonly $numTypeParams = 1

  __reifiedFullTypeString = null as unknown as `0x2::transfer_policy::TransferPolicy<${T}>`

  readonly $typeName = TransferPolicy.$typeName

  static get bcs() {
    return bcs.struct('TransferPolicy', {
      id: UID.bcs,
      balance: Balance.bcs,
      rules: VecSet.bcs(TypeName.bcs),
    })
  }

  readonly $typeArg: string

  readonly id: ToField<UID>
  readonly balance: ToField<Balance<ToPhantom<SUI>>>
  readonly rules: ToField<VecSet<TypeName>>

  private constructor(typeArg: string, fields: TransferPolicyFields<T>) {
    this.$typeArg = typeArg

    this.id = fields.id
    this.balance = fields.balance
    this.rules = fields.rules
  }

  static new<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    fields: TransferPolicyFields<ToPhantomTypeArgument<T>>
  ): TransferPolicy<ToPhantomTypeArgument<T>> {
    return new TransferPolicy(extractType(typeArg), fields)
  }

  static reified<T extends ReifiedPhantomTypeArgument>(T: T) {
    return {
      typeName: TransferPolicy.$typeName,
      typeArgs: [T],
      fullTypeName: composeSuiType(
        TransferPolicy.$typeName,
        ...[extractType(T)]
      ) as `0x2::transfer_policy::TransferPolicy<${ToPhantomTypeArgument<T>}>`,
      fromFields: (fields: Record<string, any>) => TransferPolicy.fromFields(T, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) => TransferPolicy.fromFieldsWithTypes(T, item),
      fromBcs: (data: Uint8Array) => TransferPolicy.fromBcs(T, data),
      bcs: TransferPolicy.bcs,
      fromJSONField: (field: any) => TransferPolicy.fromJSONField(T, field),
      __class: null as unknown as ReturnType<typeof TransferPolicy.new<ToTypeArgument<T>>>,
    }
  }

  static fromFields<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    fields: Record<string, any>
  ): TransferPolicy<ToPhantomTypeArgument<T>> {
    return TransferPolicy.new(typeArg, {
      id: decodeFromFields(UID.reified(), fields.id),
      balance: decodeFromFields(Balance.reified(SUI.reified()), fields.balance),
      rules: decodeFromFields(VecSet.reified(TypeName.reified()), fields.rules),
    })
  }

  static fromFieldsWithTypes<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    item: FieldsWithTypes
  ): TransferPolicy<ToPhantomTypeArgument<T>> {
    if (!isTransferPolicy(item.type)) {
      throw new Error('not a TransferPolicy type')
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg])

    return TransferPolicy.new(typeArg, {
      id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id),
      balance: decodeFromFieldsWithTypes(Balance.reified(SUI.reified()), item.fields.balance),
      rules: decodeFromFieldsWithTypes(VecSet.reified(TypeName.reified()), item.fields.rules),
    })
  }

  static fromBcs<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    data: Uint8Array
  ): TransferPolicy<ToPhantomTypeArgument<T>> {
    return TransferPolicy.fromFields(typeArg, TransferPolicy.bcs.parse(data))
  }

  toJSONField() {
    return {
      id: this.id,
      balance: this.balance.toJSONField(),
      rules: this.rules.toJSONField(),
    }
  }

  toJSON() {
    return { $typeName: this.$typeName, $typeArg: this.$typeArg, ...this.toJSONField() }
  }

  static fromJSONField<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    field: any
  ): TransferPolicy<ToPhantomTypeArgument<T>> {
    return TransferPolicy.new(typeArg, {
      id: decodeFromJSONField(UID.reified(), field.id),
      balance: decodeFromJSONField(Balance.reified(SUI.reified()), field.balance),
      rules: decodeFromJSONField(VecSet.reified(TypeName.reified()), field.rules),
    })
  }

  static fromJSON<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    json: Record<string, any>
  ): TransferPolicy<ToPhantomTypeArgument<T>> {
    if (json.$typeName !== TransferPolicy.$typeName) {
      throw new Error('not a WithTwoGenerics json object')
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(TransferPolicy.$typeName, extractType(typeArg)),
      [json.$typeArg],
      [typeArg]
    )

    return TransferPolicy.fromJSONField(typeArg, json)
  }

  static fromSuiParsedData<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    content: SuiParsedData
  ): TransferPolicy<ToPhantomTypeArgument<T>> {
    if (content.dataType !== 'moveObject') {
      throw new Error('not an object')
    }
    if (!isTransferPolicy(content.type)) {
      throw new Error(`object at ${(content.fields as any).id} is not a TransferPolicy object`)
    }
    return TransferPolicy.fromFieldsWithTypes(typeArg, content)
  }

  static async fetch<T extends ReifiedPhantomTypeArgument>(
    client: SuiClient,
    typeArg: T,
    id: string
  ): Promise<TransferPolicy<ToPhantomTypeArgument<T>>> {
    const res = await client.getObject({ id, options: { showContent: true } })
    if (res.error) {
      throw new Error(`error fetching TransferPolicy object at id ${id}: ${res.error.code}`)
    }
    if (res.data?.content?.dataType !== 'moveObject' || !isTransferPolicy(res.data.content.type)) {
      throw new Error(`object at id ${id} is not a TransferPolicy object`)
    }
    return TransferPolicy.fromFieldsWithTypes(typeArg, res.data.content)
  }
}

/* ============================== TransferPolicyCap =============================== */

export function isTransferPolicyCap(type: string): boolean {
  type = compressSuiType(type)
  return type.startsWith('0x2::transfer_policy::TransferPolicyCap<')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface TransferPolicyCapFields<T extends PhantomTypeArgument> {
  id: ToField<UID>
  policyId: ToField<ID>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class TransferPolicyCap<T extends PhantomTypeArgument> {
  static readonly $typeName = '0x2::transfer_policy::TransferPolicyCap'
  static readonly $numTypeParams = 1

  __reifiedFullTypeString = null as unknown as `0x2::transfer_policy::TransferPolicyCap<${T}>`

  readonly $typeName = TransferPolicyCap.$typeName

  static get bcs() {
    return bcs.struct('TransferPolicyCap', {
      id: UID.bcs,
      policy_id: ID.bcs,
    })
  }

  readonly $typeArg: string

  readonly id: ToField<UID>
  readonly policyId: ToField<ID>

  private constructor(typeArg: string, fields: TransferPolicyCapFields<T>) {
    this.$typeArg = typeArg

    this.id = fields.id
    this.policyId = fields.policyId
  }

  static new<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    fields: TransferPolicyCapFields<ToPhantomTypeArgument<T>>
  ): TransferPolicyCap<ToPhantomTypeArgument<T>> {
    return new TransferPolicyCap(extractType(typeArg), fields)
  }

  static reified<T extends ReifiedPhantomTypeArgument>(T: T) {
    return {
      typeName: TransferPolicyCap.$typeName,
      typeArgs: [T],
      fullTypeName: composeSuiType(
        TransferPolicyCap.$typeName,
        ...[extractType(T)]
      ) as `0x2::transfer_policy::TransferPolicyCap<${ToPhantomTypeArgument<T>}>`,
      fromFields: (fields: Record<string, any>) => TransferPolicyCap.fromFields(T, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        TransferPolicyCap.fromFieldsWithTypes(T, item),
      fromBcs: (data: Uint8Array) => TransferPolicyCap.fromBcs(T, data),
      bcs: TransferPolicyCap.bcs,
      fromJSONField: (field: any) => TransferPolicyCap.fromJSONField(T, field),
      __class: null as unknown as ReturnType<typeof TransferPolicyCap.new<ToTypeArgument<T>>>,
    }
  }

  static fromFields<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    fields: Record<string, any>
  ): TransferPolicyCap<ToPhantomTypeArgument<T>> {
    return TransferPolicyCap.new(typeArg, {
      id: decodeFromFields(UID.reified(), fields.id),
      policyId: decodeFromFields(ID.reified(), fields.policy_id),
    })
  }

  static fromFieldsWithTypes<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    item: FieldsWithTypes
  ): TransferPolicyCap<ToPhantomTypeArgument<T>> {
    if (!isTransferPolicyCap(item.type)) {
      throw new Error('not a TransferPolicyCap type')
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg])

    return TransferPolicyCap.new(typeArg, {
      id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id),
      policyId: decodeFromFieldsWithTypes(ID.reified(), item.fields.policy_id),
    })
  }

  static fromBcs<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    data: Uint8Array
  ): TransferPolicyCap<ToPhantomTypeArgument<T>> {
    return TransferPolicyCap.fromFields(typeArg, TransferPolicyCap.bcs.parse(data))
  }

  toJSONField() {
    return {
      id: this.id,
      policyId: this.policyId,
    }
  }

  toJSON() {
    return { $typeName: this.$typeName, $typeArg: this.$typeArg, ...this.toJSONField() }
  }

  static fromJSONField<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    field: any
  ): TransferPolicyCap<ToPhantomTypeArgument<T>> {
    return TransferPolicyCap.new(typeArg, {
      id: decodeFromJSONField(UID.reified(), field.id),
      policyId: decodeFromJSONField(ID.reified(), field.policyId),
    })
  }

  static fromJSON<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    json: Record<string, any>
  ): TransferPolicyCap<ToPhantomTypeArgument<T>> {
    if (json.$typeName !== TransferPolicyCap.$typeName) {
      throw new Error('not a WithTwoGenerics json object')
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(TransferPolicyCap.$typeName, extractType(typeArg)),
      [json.$typeArg],
      [typeArg]
    )

    return TransferPolicyCap.fromJSONField(typeArg, json)
  }

  static fromSuiParsedData<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    content: SuiParsedData
  ): TransferPolicyCap<ToPhantomTypeArgument<T>> {
    if (content.dataType !== 'moveObject') {
      throw new Error('not an object')
    }
    if (!isTransferPolicyCap(content.type)) {
      throw new Error(`object at ${(content.fields as any).id} is not a TransferPolicyCap object`)
    }
    return TransferPolicyCap.fromFieldsWithTypes(typeArg, content)
  }

  static async fetch<T extends ReifiedPhantomTypeArgument>(
    client: SuiClient,
    typeArg: T,
    id: string
  ): Promise<TransferPolicyCap<ToPhantomTypeArgument<T>>> {
    const res = await client.getObject({ id, options: { showContent: true } })
    if (res.error) {
      throw new Error(`error fetching TransferPolicyCap object at id ${id}: ${res.error.code}`)
    }
    if (
      res.data?.content?.dataType !== 'moveObject' ||
      !isTransferPolicyCap(res.data.content.type)
    ) {
      throw new Error(`object at id ${id} is not a TransferPolicyCap object`)
    }
    return TransferPolicyCap.fromFieldsWithTypes(typeArg, res.data.content)
  }
}

/* ============================== TransferPolicyCreated =============================== */

export function isTransferPolicyCreated(type: string): boolean {
  type = compressSuiType(type)
  return type.startsWith('0x2::transfer_policy::TransferPolicyCreated<')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface TransferPolicyCreatedFields<T extends PhantomTypeArgument> {
  id: ToField<ID>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class TransferPolicyCreated<T extends PhantomTypeArgument> {
  static readonly $typeName = '0x2::transfer_policy::TransferPolicyCreated'
  static readonly $numTypeParams = 1

  __reifiedFullTypeString = null as unknown as `0x2::transfer_policy::TransferPolicyCreated<${T}>`

  readonly $typeName = TransferPolicyCreated.$typeName

  static get bcs() {
    return bcs.struct('TransferPolicyCreated', {
      id: ID.bcs,
    })
  }

  readonly $typeArg: string

  readonly id: ToField<ID>

  private constructor(typeArg: string, id: ToField<ID>) {
    this.$typeArg = typeArg

    this.id = id
  }

  static new<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    id: ToField<ID>
  ): TransferPolicyCreated<ToPhantomTypeArgument<T>> {
    return new TransferPolicyCreated(extractType(typeArg), id)
  }

  static reified<T extends ReifiedPhantomTypeArgument>(T: T) {
    return {
      typeName: TransferPolicyCreated.$typeName,
      typeArgs: [T],
      fullTypeName: composeSuiType(
        TransferPolicyCreated.$typeName,
        ...[extractType(T)]
      ) as `0x2::transfer_policy::TransferPolicyCreated<${ToPhantomTypeArgument<T>}>`,
      fromFields: (fields: Record<string, any>) => TransferPolicyCreated.fromFields(T, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        TransferPolicyCreated.fromFieldsWithTypes(T, item),
      fromBcs: (data: Uint8Array) => TransferPolicyCreated.fromBcs(T, data),
      bcs: TransferPolicyCreated.bcs,
      fromJSONField: (field: any) => TransferPolicyCreated.fromJSONField(T, field),
      __class: null as unknown as ReturnType<typeof TransferPolicyCreated.new<ToTypeArgument<T>>>,
    }
  }

  static fromFields<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    fields: Record<string, any>
  ): TransferPolicyCreated<ToPhantomTypeArgument<T>> {
    return TransferPolicyCreated.new(typeArg, decodeFromFields(ID.reified(), fields.id))
  }

  static fromFieldsWithTypes<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    item: FieldsWithTypes
  ): TransferPolicyCreated<ToPhantomTypeArgument<T>> {
    if (!isTransferPolicyCreated(item.type)) {
      throw new Error('not a TransferPolicyCreated type')
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg])

    return TransferPolicyCreated.new(
      typeArg,
      decodeFromFieldsWithTypes(ID.reified(), item.fields.id)
    )
  }

  static fromBcs<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    data: Uint8Array
  ): TransferPolicyCreated<ToPhantomTypeArgument<T>> {
    return TransferPolicyCreated.fromFields(typeArg, TransferPolicyCreated.bcs.parse(data))
  }

  toJSONField() {
    return {
      id: this.id,
    }
  }

  toJSON() {
    return { $typeName: this.$typeName, $typeArg: this.$typeArg, ...this.toJSONField() }
  }

  static fromJSONField<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    field: any
  ): TransferPolicyCreated<ToPhantomTypeArgument<T>> {
    return TransferPolicyCreated.new(typeArg, decodeFromJSONField(ID.reified(), field.id))
  }

  static fromJSON<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    json: Record<string, any>
  ): TransferPolicyCreated<ToPhantomTypeArgument<T>> {
    if (json.$typeName !== TransferPolicyCreated.$typeName) {
      throw new Error('not a WithTwoGenerics json object')
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(TransferPolicyCreated.$typeName, extractType(typeArg)),
      [json.$typeArg],
      [typeArg]
    )

    return TransferPolicyCreated.fromJSONField(typeArg, json)
  }
}

/* ============================== TransferPolicyDestroyed =============================== */

export function isTransferPolicyDestroyed(type: string): boolean {
  type = compressSuiType(type)
  return type.startsWith('0x2::transfer_policy::TransferPolicyDestroyed<')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface TransferPolicyDestroyedFields<T extends PhantomTypeArgument> {
  id: ToField<ID>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class TransferPolicyDestroyed<T extends PhantomTypeArgument> {
  static readonly $typeName = '0x2::transfer_policy::TransferPolicyDestroyed'
  static readonly $numTypeParams = 1

  __reifiedFullTypeString = null as unknown as `0x2::transfer_policy::TransferPolicyDestroyed<${T}>`

  readonly $typeName = TransferPolicyDestroyed.$typeName

  static get bcs() {
    return bcs.struct('TransferPolicyDestroyed', {
      id: ID.bcs,
    })
  }

  readonly $typeArg: string

  readonly id: ToField<ID>

  private constructor(typeArg: string, id: ToField<ID>) {
    this.$typeArg = typeArg

    this.id = id
  }

  static new<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    id: ToField<ID>
  ): TransferPolicyDestroyed<ToPhantomTypeArgument<T>> {
    return new TransferPolicyDestroyed(extractType(typeArg), id)
  }

  static reified<T extends ReifiedPhantomTypeArgument>(T: T) {
    return {
      typeName: TransferPolicyDestroyed.$typeName,
      typeArgs: [T],
      fullTypeName: composeSuiType(
        TransferPolicyDestroyed.$typeName,
        ...[extractType(T)]
      ) as `0x2::transfer_policy::TransferPolicyDestroyed<${ToPhantomTypeArgument<T>}>`,
      fromFields: (fields: Record<string, any>) => TransferPolicyDestroyed.fromFields(T, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        TransferPolicyDestroyed.fromFieldsWithTypes(T, item),
      fromBcs: (data: Uint8Array) => TransferPolicyDestroyed.fromBcs(T, data),
      bcs: TransferPolicyDestroyed.bcs,
      fromJSONField: (field: any) => TransferPolicyDestroyed.fromJSONField(T, field),
      __class: null as unknown as ReturnType<typeof TransferPolicyDestroyed.new<ToTypeArgument<T>>>,
    }
  }

  static fromFields<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    fields: Record<string, any>
  ): TransferPolicyDestroyed<ToPhantomTypeArgument<T>> {
    return TransferPolicyDestroyed.new(typeArg, decodeFromFields(ID.reified(), fields.id))
  }

  static fromFieldsWithTypes<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    item: FieldsWithTypes
  ): TransferPolicyDestroyed<ToPhantomTypeArgument<T>> {
    if (!isTransferPolicyDestroyed(item.type)) {
      throw new Error('not a TransferPolicyDestroyed type')
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg])

    return TransferPolicyDestroyed.new(
      typeArg,
      decodeFromFieldsWithTypes(ID.reified(), item.fields.id)
    )
  }

  static fromBcs<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    data: Uint8Array
  ): TransferPolicyDestroyed<ToPhantomTypeArgument<T>> {
    return TransferPolicyDestroyed.fromFields(typeArg, TransferPolicyDestroyed.bcs.parse(data))
  }

  toJSONField() {
    return {
      id: this.id,
    }
  }

  toJSON() {
    return { $typeName: this.$typeName, $typeArg: this.$typeArg, ...this.toJSONField() }
  }

  static fromJSONField<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    field: any
  ): TransferPolicyDestroyed<ToPhantomTypeArgument<T>> {
    return TransferPolicyDestroyed.new(typeArg, decodeFromJSONField(ID.reified(), field.id))
  }

  static fromJSON<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    json: Record<string, any>
  ): TransferPolicyDestroyed<ToPhantomTypeArgument<T>> {
    if (json.$typeName !== TransferPolicyDestroyed.$typeName) {
      throw new Error('not a WithTwoGenerics json object')
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(TransferPolicyDestroyed.$typeName, extractType(typeArg)),
      [json.$typeArg],
      [typeArg]
    )

    return TransferPolicyDestroyed.fromJSONField(typeArg, json)
  }
}

/* ============================== TransferRequest =============================== */

export function isTransferRequest(type: string): boolean {
  type = compressSuiType(type)
  return type.startsWith('0x2::transfer_policy::TransferRequest<')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface TransferRequestFields<T extends PhantomTypeArgument> {
  item: ToField<ID>
  paid: ToField<'u64'>
  from: ToField<ID>
  receipts: ToField<VecSet<TypeName>>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class TransferRequest<T extends PhantomTypeArgument> {
  static readonly $typeName = '0x2::transfer_policy::TransferRequest'
  static readonly $numTypeParams = 1

  __reifiedFullTypeString = null as unknown as `0x2::transfer_policy::TransferRequest<${T}>`

  readonly $typeName = TransferRequest.$typeName

  static get bcs() {
    return bcs.struct('TransferRequest', {
      item: ID.bcs,
      paid: bcs.u64(),
      from: ID.bcs,
      receipts: VecSet.bcs(TypeName.bcs),
    })
  }

  readonly $typeArg: string

  readonly item: ToField<ID>
  readonly paid: ToField<'u64'>
  readonly from: ToField<ID>
  readonly receipts: ToField<VecSet<TypeName>>

  private constructor(typeArg: string, fields: TransferRequestFields<T>) {
    this.$typeArg = typeArg

    this.item = fields.item
    this.paid = fields.paid
    this.from = fields.from
    this.receipts = fields.receipts
  }

  static new<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    fields: TransferRequestFields<ToPhantomTypeArgument<T>>
  ): TransferRequest<ToPhantomTypeArgument<T>> {
    return new TransferRequest(extractType(typeArg), fields)
  }

  static reified<T extends ReifiedPhantomTypeArgument>(T: T) {
    return {
      typeName: TransferRequest.$typeName,
      typeArgs: [T],
      fullTypeName: composeSuiType(
        TransferRequest.$typeName,
        ...[extractType(T)]
      ) as `0x2::transfer_policy::TransferRequest<${ToPhantomTypeArgument<T>}>`,
      fromFields: (fields: Record<string, any>) => TransferRequest.fromFields(T, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) => TransferRequest.fromFieldsWithTypes(T, item),
      fromBcs: (data: Uint8Array) => TransferRequest.fromBcs(T, data),
      bcs: TransferRequest.bcs,
      fromJSONField: (field: any) => TransferRequest.fromJSONField(T, field),
      __class: null as unknown as ReturnType<typeof TransferRequest.new<ToTypeArgument<T>>>,
    }
  }

  static fromFields<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    fields: Record<string, any>
  ): TransferRequest<ToPhantomTypeArgument<T>> {
    return TransferRequest.new(typeArg, {
      item: decodeFromFields(ID.reified(), fields.item),
      paid: decodeFromFields('u64', fields.paid),
      from: decodeFromFields(ID.reified(), fields.from),
      receipts: decodeFromFields(VecSet.reified(TypeName.reified()), fields.receipts),
    })
  }

  static fromFieldsWithTypes<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    item: FieldsWithTypes
  ): TransferRequest<ToPhantomTypeArgument<T>> {
    if (!isTransferRequest(item.type)) {
      throw new Error('not a TransferRequest type')
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg])

    return TransferRequest.new(typeArg, {
      item: decodeFromFieldsWithTypes(ID.reified(), item.fields.item),
      paid: decodeFromFieldsWithTypes('u64', item.fields.paid),
      from: decodeFromFieldsWithTypes(ID.reified(), item.fields.from),
      receipts: decodeFromFieldsWithTypes(VecSet.reified(TypeName.reified()), item.fields.receipts),
    })
  }

  static fromBcs<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    data: Uint8Array
  ): TransferRequest<ToPhantomTypeArgument<T>> {
    return TransferRequest.fromFields(typeArg, TransferRequest.bcs.parse(data))
  }

  toJSONField() {
    return {
      item: this.item,
      paid: this.paid.toString(),
      from: this.from,
      receipts: this.receipts.toJSONField(),
    }
  }

  toJSON() {
    return { $typeName: this.$typeName, $typeArg: this.$typeArg, ...this.toJSONField() }
  }

  static fromJSONField<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    field: any
  ): TransferRequest<ToPhantomTypeArgument<T>> {
    return TransferRequest.new(typeArg, {
      item: decodeFromJSONField(ID.reified(), field.item),
      paid: decodeFromJSONField('u64', field.paid),
      from: decodeFromJSONField(ID.reified(), field.from),
      receipts: decodeFromJSONField(VecSet.reified(TypeName.reified()), field.receipts),
    })
  }

  static fromJSON<T extends ReifiedPhantomTypeArgument>(
    typeArg: T,
    json: Record<string, any>
  ): TransferRequest<ToPhantomTypeArgument<T>> {
    if (json.$typeName !== TransferRequest.$typeName) {
      throw new Error('not a WithTwoGenerics json object')
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(TransferRequest.$typeName, extractType(typeArg)),
      [json.$typeArg],
      [typeArg]
    )

    return TransferRequest.fromJSONField(typeArg, json)
  }
}
