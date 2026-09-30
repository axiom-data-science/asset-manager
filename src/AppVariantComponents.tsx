import { createElement, type ComponentType, type ReactElement } from 'react'
import { getAppVariantDefinition } from '@/variants/registry'
import type { AppVariantComponentProps, AppVariantComponents } from '@/variants/types'

export type { AppVariantComponentProps, AppVariantComponents } from '@/variants/types'

type AppVariantComponentArgs<K extends keyof AppVariantComponentProps> =
  AppVariantComponentProps[K] extends undefined ? [] : [props: AppVariantComponentProps[K]]

export const getAppVariantComponent = <K extends keyof AppVariantComponents>(
  variantId: string | undefined,
  component: K,
  ...args: AppVariantComponentArgs<K>
): ReactElement | null => {
  const Component = getAppVariantDefinition(variantId)?.components?.[component]
  if (!Component) return null

  const props = (args[0] ?? {}) as Exclude<AppVariantComponentProps[K], undefined>
  return createElement(Component as ComponentType<object>, props)
}
