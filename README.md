# K8s API Client

[![CircleCI](https://circleci.com/gh/FireBlinkLTD/json-streaming-reader.svg?style=svg)](https://circleci.com/gh/FireBlinkLTD/json-streaming-reader)
[![codecov](https://codecov.io/gh/FireBlinkLTD/json-streaming-reader/branch/master/graph/badge.svg)](https://codecov.io/gh/FireBlinkLTD/json-streaming-reader)

Yet another K8s client that is _NOT_ generated from OpenAPI spec and doesn't provide resource specific methods.

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

### Make GET request(s)

Make GET request:

```typescript
import { APIRequestProcessor } from '@fireblink/k8s-api-client';

const processor = new APIRequestProcessor();
const resource = await processor.get('/apis/fireblink.com/v1/namespaces/default/customresources/resource-name');
```

Sometimes you may need to get all stored records and don't mess with pagination on your own. To do that use following helper function:

```typescript
import { APIRequestProcessor } from '@fireblink/k8s-api-client';

const processor = new APIRequestProcessor();
const response = await processor.getAll(
  '/apis/fireblink.com/v1/namespaces/default/customresources',
  // optionaly provide query parameters to pass with custom limit value, default one is 100
  {
    limit: 200,
  },
);

// Response contains all items:
console.log(response.items);

// and resourceVersion that might be handy to be used with "watch" action (see below)
```

## Make POST request

```typescript
import {APIRequestProcessor} from '@fireblink/k8s-api-client';

const processor = new APIRequestProcessor();
const resource = await processor.post(
    '/apis/fireblink.com/v1/namespaces/default/customresources',
    // JSON request body:
    {
        apiVersion: 'fireblink.com/v1'
        kind: 'FTPO'
        metadata: {
            name: 'test'
        }
    },
     // optional query parameters:
    {}
);
```

## Make PUT request

```typescript
import {APIRequestProcessor} from '@fireblink/k8s-api-client';

const processor = new APIRequestProcessor();
const resource = await processor.put(
    '/apis/fireblink.com/v1/namespaces/default/customresources/test',
    // JSON request body:
    {
        apiVersion: 'fireblink.com/v1'
        kind: 'FTPO'
        metadata: {
            resourceVersion: 1, // <- this is important for update operation
            name: 'test'
        }
    },
     // optional query parameters:
    {}
);
```

## Make DELETE request

```typescript
import { APIRequestProcessor } from '@fireblink/k8s-api-client';

const processor = new APIRequestProcessor();
const resource = await processor.delete('/apis/fireblink.com/v1/namespaces/default/customresources/test');
```

## Make PATCH request(s)

### JSON Merge

The simpliest solution on how you may want to change existing resource.
Please refer to [RFC 7386](https://tools.ietf.org/html/rfc7386) for more information on how merging is working.

```typescript
import { APIRequestProcessor } from '@fireblink/k8s-api-client';

const processor = new APIRequestProcessor();
const resource = await processor.merge('/apis/fireblink.com/v1/namespaces/default/customresources/test', {
  spec: {
    newField: 'yes',
    removeOld: null,
  },
});
```

### JSON Patch

This is a more advanced version of how existing resources can be updated.
Please refer to [RFC 6902](https://tools.ietf.org/html/rfc6902) for more information on how patching is working.

```typescript
import { APIRequestProcessor } from '@fireblink/k8s-api-client';

const processor = new APIRequestProcessor();
const resource = await processor.merge('/apis/fireblink.com/v1/namespaces/default/customresources/test', [
  { op: 'add', path: '/spec/newItem', value: 'yes' },
  { op: 'remove', path: '/spec/removeOld' },
]);
```

## Watch

Another common usecase is to have a listener to track K8s resource changes.

```typescript
import { WatchRequestProcessor } from '@fireblink/k8s-api-client';

const processor = new WatchRequestProcessor();

await processor.watch(
  '/apis/fireblink.com/v1/namespaces/default/customresources',
  {
    // called when API call returns 410 code - GONE
    // when such happens you generally need to refetch the list of records and start again
    // with the resourceVersion returned (see `getAll` method above)
    gone: async () => {},

    // called when object is added
    added: async (obj: any) => {},

    // called when object get changed
    modified: async (obj: any) => {},

    // called when object get removed
    deleted: async (obj: any) => {},
  },
  // optionally provide resourceVersion as a third parameter
);
```
