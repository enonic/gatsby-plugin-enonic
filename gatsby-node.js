const _ = require(`lodash`)
const gatsbySourceGraphQLNode = require(`gatsby-source-graphql/gatsby-node`);

const schemaName = 'XP';
const schemaPrefix = `${schemaName}_`;

exports.sourceNodes = async (
    utils,
    {
        typeName = schemaName,
        fieldName = schemaName.toLowerCase(),
        refetchInterval,
        ...options
    }
) => {
    const { url } = options;

    if (!url) {
        throw new Error(`gatsby-plugin-enonic requires GraphQL API endpoint to be specified (\`options.url\`)`);
    }

    await gatsbySourceGraphQLNode.sourceNodes(utils, {
        typeName,
        fieldName,
        refetchInterval,
        url: url
    });
};

// Create Pages
exports.createPages = async ({ graphql, actions, reporter }, options) => {
    const { pages } = options;

    if (!pages) {
        throw new Error(`gatsby-plugin-enonic requires at least one page definition to be specified (\`options.pages\`)`);
    }

    const { createPage } = actions
    const schemaTypes = await getContentTypes(graphql, reporter);

    return await Promise.all(
        pages.map(async pageDef =>
            await createCustomPages(graphql, createPage, reporter, pageDef, schemaTypes)
        )
    )
}

const processTypesInQuery = async (query, types) => {
    types.forEach(type => {
        query = query.replace(` on ${type}`, ` on ${schemaPrefix}${type}`)
    })

    return query;
}

const getContentTypes = async (graphql, reporter) => {
    const result = await graphql(
    `{
      __schema {
        types {
          name
          possibleTypes {
            name
          }
        }
      }
    }`
    )

    if (result.errors) {
        reporter.panic(result.errors)
    }

    const contentInterface = result.data.__schema.types.filter(type => type.name === `${schemaPrefix}Content`)[0];

    if (!contentInterface || !contentInterface.possibleTypes || !contentInterface.possibleTypes.length) {
        throw new Error(`No content types found in GraphQL schema!`);
    }

    return contentInterface.possibleTypes.map(type => type.name.slice(schemaPrefix.length));
}

const createCustomPages = async (graphql, createPage, reporter, pageDef, schemaTypes) => {
    const query = await processTypesInQuery(pageDef.query, schemaTypes);
    const result = await graphql(
    `{
      xp {
        guillotine {
            nodes: ${query}
        }
      }
    }`
    )

    if (result.errors) {
        reporter.panic(result.errors)
    }

    const nodes = result.data.xp.guillotine.nodes;

    const detailsPagePath = (pageDef.details ? pageDef.details.path : '') || pageDef.list.path;

    if (pageDef.list) {

        // Create node list pages
        createPage({
            path: pageDef.list.path,
            component: require.resolve(pageDef.list.template),
            context: {
                nodes,
                detailsPath: detailsPagePath
            },
        })
    }

    if (pageDef.details) {

        // Create individual node pages
        nodes.forEach(node => {

            createPage({
                path: `${detailsPagePath}/${_.kebabCase(node[pageDef.details.key])}`,
                component: require.resolve(pageDef.details.template),
                context: {
                    node,
                    listPath: pageDef.list.path
                },
            })
        })
    }

    return result;
}
