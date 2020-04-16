const _ = require(`lodash`);
const gatsbySourceGraphQLNode = require(`gatsby-source-graphql/gatsby-node`);
const { parse } = require('graphql');

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
    const { api, refetchInterval } = options;
    const { reporter } = utils;

    if (!api) {
        reporter.panic(`gatsby-plugin-enonic requires GraphQL API endpoint to be specified (\`options.api\`)`);
    }

    await gatsbySourceGraphQLNode.sourceNodes(utils, {
        typeName,
        fieldName,
        refetchInterval,
        url: api
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
      pages.map(async pageDef => {

            validatePageDefinition(pageDef, reporter);

            const query = await prepareQuery(pageDef.query, reporter, schemaTypes, application);
            const nodes = await fetchDataNodes(query, graphql, reporter);

            await createCustomPages(createPage, nodes, pageDef);

        }
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

const processPlaceholders = (queryTemplate, application) => {
    const _app = `${application}_`.replace(/\./g, '_');

    let result = queryTemplate.replace(/%application%_/, _app); // Replace "%application%_" with "com_example_myproject_"
    result = result.replace(/%application%/, application);      // Replace "%application%" with "com.example.myproject"

    return result;
};

const firstOperationDefinition = (ast) => ast.definitions[0];

const firstFieldValueNameFromOperation = (operationDefinition) =>  {
    return operationDefinition.selectionSet.selections[0].name.value;
};

const secondFieldValueNameFromOperation = (query) =>  {
    const parsedQuery = parse(query);
    const definition = firstOperationDefinition(parsedQuery);
    return definition.selectionSet.selections[0].selectionSet.selections[0].name.value;
};

const getWrapperField = (query) =>  {
    const parsedQuery = parse(query);

    const definition = firstOperationDefinition(parsedQuery);
    const firstFieldName = firstFieldValueNameFromOperation(definition);

    return firstFieldName;
};

const wrapQuery = (query) => {
    const fieldName = secondFieldValueNameFromOperation(query);
    const wrappedQuery = `{${schemaName.toLowerCase()} ${query.replace(fieldName, `nodes: ${fieldName}`)}}`;

    return wrappedQuery;
};

const prepareQuery = async (queryPath, reporter, schemaTypes, application) => {
    let query = require(queryPath);

    if (typeof query !== 'string' || !query.trim()) {
        reporter.panic(`gatsby-plugin-enonic failed to find query at ${queryPath}`);
    }

    query = application ? await processPlaceholders(query, application) : query; // Replace application placeholders
    query = await processTypesInQuery(query, schemaTypes);                 // Add "XP_" prefix to content types

    return query;
};

const fetchDataNodes = async (query, graphql, reporter) => {

    const wrapperField = getWrapperField(query);

    if (!wrapperField || wrapperField === 'query') {
        reporter.panic(`Missing wrapper field in query: ${query}`);
    }

    const result = await graphql(wrapQuery(query));

    if (result.errors) {
        reporter.panic(result.errors);
    }

    return result.data[schemaName.toLowerCase()][wrapperField].nodes;
}

const validatePageDefinition = (pageDef, reporter) => {
    if (!pageDef.query) {
        reporter.panic('gatsby-plugin-enonic requires query in page definition (`options.pages.query`)')
    }

    if (pageDef.list) {

        if (!pageDef.list.url) {
            reporter.panic('gatsby-plugin-enonic requires url for the list page (`options.pages.list.url`)');
        }

        if (!pageDef.list.template) {
            reporter.panic('gatsby-plugin-enonic requires template for the list page (`options.pages.list.template`)');
        }

    }

    if (pageDef.details) {

        if (!pageDef.details.template) {
            reporter.panic('gatsby-plugin-enonic requires template for the list page (`options.pages.details.template`)');
        }

    }
};

const getDetailsPageUrl = (pageDef) => {
    const baseDetailsPageUrl = (pageDef.details ? pageDef.details.url : '') || (pageDef.list ? pageDef.list.url : '').trim();
    const detailsPageUrl = baseDetailsPageUrl.slice(-1) === '/' ? baseDetailsPageUrl.slice(0, -1) : baseDetailsPageUrl;

    return detailsPageUrl;
};

const createListPage = (createPage, nodes, pageDef) => {
    if (!pageDef.list) {
        return;
    }

    const key = pageDef.details.key || 'id';

    // Create node list pages
    createPage({
        path: pageDef.list.url,
        component: pageDef.list.template,
        context: {
            nodes,
            detailsPageUrl: pageDef.details ? getDetailsPageUrl(pageDef) : null,
            detailsPageKey: pageDef.details ? key : null,
            title: pageDef.list.title
        },
    })
};

const createDetailPages = (createPage, nodes, pageDef) => {
    if (!pageDef.details) {
        return;
    }

    const detailsPageUrl = getDetailsPageUrl(pageDef);

    const key = pageDef.details.key || 'id';

    // Create individual node pages
    nodes.forEach(node => {

        createPage({
            path: `${detailsPageUrl}/${_.kebabCase(node[key])}`,
            component: pageDef.details.template,
            context: {
                node,
                listPageUrl: pageDef.list ? pageDef.list.url : '',
                title: pageDef.details.title
            },
        })
    })
};

const createCustomPages = async (createPage, nodes, pageDef) => {
    createListPage(createPage, nodes, pageDef);
    createDetailPages(createPage, nodes, pageDef);
};
