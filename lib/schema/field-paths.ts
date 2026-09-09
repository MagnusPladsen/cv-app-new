import { z } from 'zod'

/**
 * Every leaf field path in a zod schema, dot-separated.
 *
 * Array element and union member paths collapse to the array's own path:
 * `sections.entries.role` describes every entry, and inventorying each index
 * separately would say nothing extra about what is stored.
 */
export function collectFieldPaths(schema: z.ZodType, prefix = ''): string[] {
  const unwrapped = unwrap(schema)

  if (unwrapped instanceof z.ZodObject) {
    const shape = unwrapped.shape as Record<string, z.ZodType>
    return Object.entries(shape).flatMap(([key, value]) =>
      collectFieldPaths(value, prefix ? `${prefix}.${key}` : key),
    )
  }

  if (unwrapped instanceof z.ZodArray) {
    return collectFieldPaths(unwrapped.element as z.ZodType, prefix)
  }

  if (unwrapped instanceof z.ZodUnion || unwrapped instanceof z.ZodDiscriminatedUnion) {
    const options = unwrapped.options as z.ZodType[]
    return [...new Set(options.flatMap((option) => collectFieldPaths(option, prefix)))]
  }

  return prefix ? [prefix] : []
}

/** Strips optional, nullable and default wrappers. */
function unwrap(schema: z.ZodType): z.ZodType {
  let current = schema
  for (let i = 0; i < 10; i += 1) {
    if (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
      current = current.unwrap() as z.ZodType
      continue
    }
    if (current instanceof z.ZodDefault) {
      current = current.def.innerType as z.ZodType
      continue
    }
    return current
  }
  return current
}
