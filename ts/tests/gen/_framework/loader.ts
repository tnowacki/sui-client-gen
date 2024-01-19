import { compressSuiType, parseTypeName } from './util'
import {
  Primitive,
  ReifiedTypeArgument,
  StructClassReified,
  VectorReified,
  vector,
} from './reified'

export type PrimitiveValue = string | number | boolean | bigint

interface StructClass {
  $typeName: string
  $numTypeParams: number
  reified(...Ts: ReifiedTypeArgument[]): StructClassReified
}

export class StructClassLoader {
  private map: Map<string, StructClass> = new Map()

  register(...classes: StructClass[]) {
    for (const cls of classes) {
      this.map.set(cls.$typeName, cls)
    }
  }

  reified<T extends Primitive>(type: T): T
  reified(type: `vector<${string}>`): VectorReified
  reified(type: string): StructClassReified
  reified(type: string): ReifiedTypeArgument {
    const { typeName, typeArgs } = parseTypeName(compressSuiType(type))
    switch (typeName) {
      case 'bool':
      case 'u8':
      case 'u16':
      case 'u32':
      case 'u64':
      case 'u128':
      case 'u256':
      case 'address':
        return typeName
      case 'vector': {
        if (typeArgs.length !== 1) {
          throw new Error(`Vector expects 1 type argument, but got ${typeArgs.length}`)
        }
        return vector(this.reified(typeArgs[0]))
      }
    }

    if (!this.map.has(typeName)) {
      throw new Error(`Unknown type ${typeName}`)
    }

    const cls = this.map.get(typeName)!
    if (cls.$numTypeParams !== typeArgs.length) {
      throw new Error(
        `Type ${typeName} expects ${cls.$numTypeParams} type arguments, but got ${typeArgs.length}`
      )
    }

    return cls.reified(...typeArgs.map(t => this.reified(t)))
  }
}

export const structClassLoaderSource = new StructClassLoader()
export const structClassLoaderOnchain = new StructClassLoader()
