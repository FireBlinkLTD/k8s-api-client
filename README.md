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
import {RESTRequestProcessor} from '@fireblink/k8s-api-client';

const processor = new RESTRequestProcessor();
const resource = await processor.get(
    '/apis/fireblink.com/v1/namespaces/default/customresources/resource-name'
);
```

Sometimes you may need to get all stored records and don't mess with pagination on your own. To do that use following helper function:

```typescript
import {RESTRequestProcessor} from '@fireblink/k8s-api-client';

const processor = new RESTRequestProcessor();
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

```typescript
import {WatchRequestProcessor} from '@fireblink/k8s-api-client';

const processor = new WatchRequestProcessor();

await processor.watch(
    '/apis/fireblink.com/v1/namespaces/default/customresources',
    {
        // called when API call returns 410 code - GONE
        // when such happens you generally need to refetch the list of records and start again 
        // with the resourceVersion returned (see `getAll` method above)
        gone: async () => {

        },

        // called when object is added
        added: async (obj: any) => {

        },

        // called when object get changed
        modified: async (obj: any) => {

        },

        // called when object get removed
        deleted: async (obj: any) => {

        }
    },
    // optionally provide resourceVersion as a third parameter
);
```