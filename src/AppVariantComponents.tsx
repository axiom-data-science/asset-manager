import { createElement, type ComponentType, type ReactElement } from 'react'
import { useAppVariant } from '@/variants/context'
import type { AppVariantComponentProps, AppVariantComponents } from '@/variants/types'

export type { AppVariantComponentProps, AppVariantComponents } from '@/variants/types'

type AppVariantComponentArgs<K extends keyof AppVariantComponentProps> =
  AppVariantComponentProps[K] extends undefined ? [] : [props: AppVariantComponentProps[K]]

export const useAppVariantComponent = <K extends keyof AppVariantComponents>(
  component: K,
  ...args: AppVariantComponentArgs<K>
): ReactElement | null => {
  const { definition } = useAppVariant()
  const Component = definition?.components?.[component]
  if (!Component) return null

  const props = (args[0] ?? {}) as Exclude<AppVariantComponentProps[K], undefined>
  return createElement(Component as ComponentType<object>, props)
}
