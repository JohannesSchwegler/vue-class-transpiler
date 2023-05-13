import * as t from '@babel/types'

export function funcExpressionToArrowFuncExpression(func: t.FunctionExpression) {
  const arrowFunc = t.arrowFunctionExpression(func.params, func.body, func.async)
  arrowFunc.returnType = func.returnType
  arrowFunc.async = func.async
  return arrowFunc
}
