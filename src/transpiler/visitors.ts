import { TraverseOptions } from '@babel/traverse'
import * as t from '@babel/types'

export class Visitors {
  static updateThisExpression(hoistedDeclarations: {
    refs: Set<string>
    reactives: Set<string>
  }): TraverseOptions {
    return {
      MemberExpression(path) {
        // this.call()  => call()
        if (
          t.isThisExpression(path.node.object) &&
          t.isCallExpression(path.parent) &&
          t.isIdentifier(path.node.property)
        ) {
          if (path.key === 'callee') {
            path.parent.callee = t.identifier(path.node.property.name)
          }
        }
        // this.ref => ref.value
        if (
          t.isThisExpression(path.node.object) &&
          !t.isPrivateName(path.node.property) &&
          t.isIdentifier(path.node.property)
        ) {
          // Check this.store calls
          if (
            t.isMemberExpression(path.parent) &&
            /.*Store\b/gm.test(path.node.property.name) &&
            'object' in path.parentPath
          ) {
            path.parentPath.object = t.identifier(path.node.property.name)
          }

          const { reactives } = hoistedDeclarations

          if (reactives.has(path.node.property.name)) {
            ;(path.container as Record<string, unknown>)[path.key] = t.identifier(
              path.node.property.name
            )
          } else {
            // Fallback to refs => .value
            path.replaceWith(t.memberExpression(path.node.property, t.identifier('value'), false))
          }
        }
      }
    }
  }

  static updatePrefix(): TraverseOptions {
    return {
      Identifier(path) {
        if (path.node.name.startsWith('$')) {
          path.node.name = path.node.name.slice(1)
        }
      }
    }
  }
}
