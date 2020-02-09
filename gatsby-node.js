const _ = require(`lodash`)
const gatsbySourceGraphQLNode = require(`gatsby-source-graphql/gatsby-node`);

exports.sourceNodes = async (
    utils,
    {
        typeName = 'XP',
        fieldName = 'xp',
        refetchInterval,
        ...options
    }
) => {
    const { url } = options;

    if (!url) {
        return;
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
    const { createPage } = actions

    if (!pages) {
        return;
    }

    return await Promise.all(
        pages.map(async pageDef =>
            await createCustomPages(graphql, createPage, reporter, pageDef)
        )
    )
}

const createCustomPages = async (graphql, createPage, reporter, pageDef) => {
    const result = await graphql(
    `{
      xp {
        guillotine {
            nodes: ${pageDef.query}
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
