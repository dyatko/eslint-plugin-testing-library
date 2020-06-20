import { ESLintUtils, TSESTree } from '@typescript-eslint/experimental-utils';
import { getDocsUrl } from '../utils';
import {
  isIdentifier,
  isMemberExpression,
  isObjectPattern,
  isProperty,
  isRenderVariableDeclarator,
} from '../node-utils';

export const RULE_NAME = 'no-container';

export default ESLintUtils.RuleCreator(getDocsUrl)({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow the use of container methods',
      category: 'Best Practices',
      recommended: 'error',
    },
    messages: {
      noContainer:
        'Avoid using container to query for elements. Prefer using query methods from Testing Library, such as "getByRole()"',
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          renderFunctions: {
            type: 'array',
          },
        },
      },
    ],
  },
  defaultOptions: [
    {
      renderFunctions: [],
    },
  ],

  create(context, [options]) {
    const { renderFunctions } = options;
    let hasPropertyContainer = false;
    let containerName: string = null;
    let renderWrapperName: string = null;
    const destructuredContainerPropNames: string[] = [];

    return {
      VariableDeclarator(node) {
        if (isRenderVariableDeclarator(node, renderFunctions)) {
          if (isObjectPattern(node.id)) {
            const containerIndex = node.id.properties.findIndex(
              property =>
                isProperty(property) &&
                isIdentifier(property.key) &&
                property.key.name === 'container'
            );
            const nodeValue =
              containerIndex !== -1 && node.id.properties[containerIndex].value;
            if (isIdentifier(nodeValue)) {
              containerName = nodeValue.name;
            } else {
              isObjectPattern(nodeValue) &&
                nodeValue.properties.forEach(
                  property =>
                    isProperty(property) &&
                    isIdentifier(property.key) &&
                    destructuredContainerPropNames.push(property.key.name)
                );
            }
          } else {
            renderWrapperName = isIdentifier(node.id) && node.id.name;
          }
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        function showErrorForChainedContainerMethod(
          innerNode: TSESTree.MemberExpression
        ) {
          if (isMemberExpression(innerNode)) {
            if (isIdentifier(innerNode.object)) {
              const isContainerName = innerNode.object.name === containerName;
              const isRenderWrapper =
                innerNode.object.name === renderWrapperName;

              hasPropertyContainer =
                isIdentifier(innerNode.property) &&
                innerNode.property.name === 'container' &&
                isRenderWrapper;

              if (isContainerName || hasPropertyContainer) {
                context.report({
                  node: innerNode,
                  messageId: 'noContainer',
                });
              }
            }
            showErrorForChainedContainerMethod(
              innerNode.object as TSESTree.MemberExpression
            );
          }
        }
        if (isMemberExpression(node.callee)) {
          showErrorForChainedContainerMethod(node.callee);
        } else if (isIdentifier(node.callee)) {
          destructuredContainerPropNames.includes(node.callee.name) &&
            context.report({
              node,
              messageId: 'noContainer',
            });
        }
      },
    };
  },
});
