# Gatsby plugin for Enonic XP

This little plugin helps you generate static Gatsby pages based on data fetched via Headless API from Enonic XP.

By using GraphQL queries in plugin configuration you can specify data fields which you will output on the site pages.

## Pre-requisites

This plugin can only be used in a GatsbyJS site or application. 
It also requires an endpoint to GraphQL API, either preconfigured or provided by [Enonic Headless starter](https://github.com/enonic/starter-headless).

## Usage

To install:

```
npm install --save gatsby-plugin-enonic
```

Then add the config to your `gatsby-config.js`:

```js
module.exports = {
  /* ... */
  plugins: [
    /* ... */

    {
      resolve: "gatsby-plugin-enonic",
      options: {
        api: "http://localhost:8080/site/default/draft/hmdb/api",
        refetchInterval: 30,
        pages: [{
          query: require.resolve('./src/queries/getMovies'),
          list: {
            url: "/movies",
            template: require.resolve("./src/templates/movies.js"),
            title: 'Movies'
          },
          details: {
            url: '/movie', // Remove to use list.url
            template: require.resolve("./src/templates/movie.js"),
            key: 'name',
            title: '.displayName'
          }
        }]
      }
    }
  ]
}
```

### options

####api
GraphQL API endpoint delivering headless content.


####refetchInterval
_(optional)_

How often data is re-fetched from the server (in seconds).


####pages.query

Relative path to a Javascript file which exports (via `module.exports`) a GraphQL query to retrieve nodes to be listed on the `pages.list.path` page. Must be resolved with `require.resolve()`.


####pages.list.url

Expected URL for the generated listing page, for example if you use `movies` the page will be available under `mysite.com/movies`. Will also be used for detail pages if `pages.details.url` is not provided.


####pages.list.template

Relative path to React template of the listing page. Must be resolved with `require.resolve()`.


####pages.list.title
_(optional)_

Page title for the listing page.


####pages.details.url
_(optional)_

Expected URL for the generated details page, for example if you use `movie` the page will be available under `mysite.com/movie/{key}`. If omitted, value from `pages.list.url` will be used.


####pages.details.key
_(optional)_

Field in the query whose value will be appended to `pages.details.url`. If omitted, `id` field will be used.


####pages.details.template

Relative path to React template of the detail page. Must be resolved with `require.resolve()`.


####pages.details.title
_(optional)_

Page title for the detail page.


## Example

For a working example of `gatsby-plugin-enonic`, see
[Gatsby plugin guide](https://github.com/enonic/guide-gatsby-starter).


## Thanks

This plugin uses
[`gatsby-source-graphql`](https://github.com/gatsbyjs/gatsby/tree/master/packages/gatsby-source-graphql#readme)
to make GraphQL schema from Headless API available to Gatsby.


## Helpful links

- [Guide to Enonic plugin for Gatsby](https://developer.enonic.com/guides/static-websites-with-gatsbyjs-and-enonic-xp)
- [Enonic Headless starter](https://github.com/enonic/starter-headless)
- [Guide to Enonic Headless starter](https://developer.enonic.com/templates/headless-cms)
- [Sample site using Enonic plugin for Gatsby](https://github.com/enonic/guide-gatsby-starter)
- [Gatsby documentation](https://www.gatsbyjs.org/)
