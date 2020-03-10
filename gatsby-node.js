const _ = require(`lodash`);
const gatsbySourceGraphQLNode = require(`gatsby-source-graphql/gatsby-node`);

const schemaName = 'XP';
const schemaPrefix = `${schemaName}_`;

exports.sourceNodes = async (
    utils,
    {
        typeName = schemaName,
        fieldName = schemaName.toLowerCase(),
        ...options
    }
) => {
    const { url, refetchInterval } = options;
    const { reporter } = utils;

    if (!url) {
        reporter.panic(`gatsby-plugin-enonic requires GraphQL API endpoint to be specified (\`options.url\`)`);
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
    const { application, pages } = options;

    if (!pages || !pages.length) {
        reporter.panic(`gatsby-plugin-enonic requires at least one page definition to be specified (\`options.pages\`)`);
    }

    const { createPage } = actions;
    const schemaTypes = await getContentTypes(graphql, reporter);

    return await Promise.all(
        pages.map(async pageDef =>
            await createCustomPages(graphql, createPage, reporter, pageDef, schemaTypes, application)
        )
    )
};

const processTypesInQuery = async (query, types) => {
    types.forEach(type => {
        query = query.replace(new RegExp(` on ${type}`, 'g'), ` on ${schemaPrefix}${type}`);
    });

    return query;
};

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
    );

    if (result.errors) {
        reporter.panic(result.errors);
    }

    const contentInterface = result.data.__schema.types.filter(type => type.name === `${schemaPrefix}Content`)[0];

    if (!contentInterface || !contentInterface.possibleTypes || !contentInterface.possibleTypes.length) {
        reporter.panic('gatsby-plugin-enonic failed to find content types in the GraphQL schema!');
    }

    return contentInterface.possibleTypes.map(type => type.name.slice(schemaPrefix.length));
};

const sanitizeTemplate = (queryTemplate, application) => {
    const _app = `${application}_`.replace(/\./g, '_');

    let result = queryTemplate.replace(/%application%_/, _app); // Replace "%application%_" with "com_example_myproject_"
    result = result.replace(/%application%/, application);      // Replace "%application%" with "com.example.myproject"

    return result;
};

const createCustomPages = async (graphql, createPage, reporter, pageDef, schemaTypes, application) => {
    if (!pageDef.query) {
        reporter.panic('gatsby-plugin-enonic requires query in page definition (`options.pages.query`)')
    }
    const queryTemplate = require(pageDef.query);

    if (typeof queryTemplate !== 'string' || !queryTemplate.trim()) {
        reporter.panic(`gatsby-plugin-enonic failed to find query at ${pageDef.query}`);
    }

    const sanitizedTemplate = application ? sanitizeTemplate(queryTemplate, application) : queryTemplate;
    const query = await processTypesInQuery(sanitizedTemplate, schemaTypes);
    const result = await graphql(
    `{
      ${schemaName.toLowerCase()} {
        guillotine {
            nodes: ${query}
        }
      }
    }`
    );

    if (result.errors) {
        reporter.panic(result.errors);
    }

    const nodes = result.data.xp.guillotine.nodes;

    const detailsPageUrl = (pageDef.details ? pageDef.details.url : '') || (pageDef.list ? pageDef.list.url : '');

    if (pageDef.list) {

        if (!pageDef.list.url) {
            reporter.panic('gatsby-plugin-enonic requires url for the list page (`options.pages.list.url`)');
        }

        if (!pageDef.list.template) {
            reporter.panic('gatsby-plugin-enonic requires template for the list page (`options.pages.list.template`)');
        }

        // Create node list pages
        createPage({
            path: pageDef.list.url,
            component: pageDef.list.template,
            context: {
                nodes,
                detailsPageUrl: detailsPageUrl,
                detailsPageKey: pageDef.details ? pageDef.details.key : null
            },
        })
    }

    if (pageDef.details) {

        if (!pageDef.details.key) {
            reporter.panic('gatsby-plugin-enonic requires id field for the details page (`options.pages.details.key`)');
        }

        if (!pageDef.details.template) {
            reporter.panic('gatsby-plugin-enonic requires template for the list page (`options.pages.details.template`)');
        }

        // Create individual node pages
        nodes.forEach(node => {

            createPage({
                path: `${detailsPageUrl}/${_.kebabCase(node[pageDef.details.key])}`,
                component: pageDef.details.template,
                context: {
                    node,
                    listPageUrl: pageDef.list ? pageDef.list.url : ''
                },
            })
        })
    }

    return result;
};
