# K8s API Client

Yet another K8s client that is *NOT* generated from OpenAPI spec and doesn't provide resource specific methods.

Instead this module allows to interact with K8s API by providing exact URN (URL path).
While it may sound limited to what other modules provide - it is in fact more powerful.

## Installation

If you're NPM user:

```bash
npm i --save @fireblink/k8s-api-client
```

If you're YARN user:

```bash
yarn add @fireblink/k8s-api-client
```

## Usage

### Get

Make GET request:

```javascript
import {GetRequestProcessor} from '@fireblink/k8s-api-client';

const processor = new GetRequestProcessor();

const resource = await processor.get(
    '/apis/fireblink.com/v1/namespaces/default/customresources/resource-name'
);
```

Sometimes you may need to get all stored records and don't mess with pagination on your own. To do that use following helper function:

```javascript

const processor = new GetRequestProcessor();

const response = await processor.getAll(
    '/apis/fireblink.com/v1/namespaces/default/customresources',
    // optionaly provide query parameters to pass with custom limit value, default one is 100
    {
        limit: 200 
    }
);

// Response contains all items:
console.log(response.items);

// and resourceVersion that might be handy to be used with "watch" action (see below)
```

### Watch

Another common usecase is to have a listener to track K8s resource changes.

```javascript
import {WatchRequestProcessor} from '@fireblink/k8s-api-client';

const processor = new WatchRequestProcessor();

await processor.watch(
    '/apis/fireblink.com/v1/namespaces/default/customresources',
    {
        // called when API call returns 410 code - GONE
        // when such happens you generally need to refetch the list of records and start again 
        // with the resourceVersion returned (see `getAll` method above)
        gone: function() {

        },

        // called when object is added
        added: function(obj) {

        },

        // called when object get changed
        modified: function(obj) {

        },

        // called when object get removed
        deleted: function(obj) {

        }
    },
    // optionally provide resourceVersion as a third parameter
);
```