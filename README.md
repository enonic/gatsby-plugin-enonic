# Gatsby plugin for Enonic XP

This little plugin helps you generate static Gatsby pages based on data provided by Enonic XP via Headless starter.

By using GraphQL queries in plugin configuration you can specify data fields which you will output on the site pages.

## Pre-requisites

This plugin can only be used in an application that is using `gatsby` NPM module, ideally created based on one of the 
Gatsby starters. It also requires an endpoint to GraphQL API provided by
[Enonic Headless starter](https://github.com/enonic/starter-headless).

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
        url: "http://localhost:8080/site/default/draft/hmdb/api",
        refetchInterval: 10,
        pages: [{
          list: {
            path: "/movies",
            template: require.resolve("./src/templates/movies.js")
          },
          details: {
            path: '/movie', // Remove to use list.path
            template: require.resolve("./src/templates/movie.js"),
            key: 'name'
          },
          query: '/src/queries/getMovies'
        }]
      }
    }
  ]
}
```

* `url` - GraphQL API endpoint of the Headless starter
* `refetchInterval` - how often data is reloaded (in seconds)
* `pages.query` - path to a JS file which exports (via `module.exports`) a GraphQL query to retrieve nodes to be listed on the `pages.list.path` page
* `pages.list.path` - expected path for the generated listing page, for example if you use `movies` the page will be available under `mysite.com/movies`
* `pages.list.template` - template for the listing page
* `pages.details.path` - expected path for the generated details page, for example if you use `movie` the page will be available under `mysite.com/movie/{key}` (if omitted, value from `pages.list.path` will be used)
* `pages.details.key` - field in the query whose value will be added to the details page url (see above)
* `pages.details.template` - template for the details page


## Example

For a working example of `gatsby-plugin-enonic`, see
[gatsby-plugin-enonic-example](https://github.com/enonic/gatsby-plugin-enonic-example).


## Thanks

This plugin uses
[`gatsby-source-graphql`](https://github.com/gatsbyjs/gatsby/tree/master/packages/gatsby-source-graphql#readme)
to inject Enonic Headless starter's GraphQL schema into Gatsby's.


## Helpful links

- [Enonic Headless starter](https://developer.enonic.com/templates/headless-cms)
- [Guide to Enonic Headless starter](https://github.com/enonic/starter-headless)
- [gatsby-plugin-enonic-example](https://github.com/enonic/gatsby-plugin-enonic-example)
- [Gatsby documentation](https://www.gatsbyjs.org/)
