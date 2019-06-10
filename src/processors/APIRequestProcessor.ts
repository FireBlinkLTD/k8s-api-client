import * as request from 'request';

import { BaseRequestProcessor } from './BaseRequestProcessor';
import { IPatchBodyItem } from '../interfaces';

import * as Debug from 'debug';
import { RequestError } from '../models';
const debug = Debug('@fireblink/k8s-api-client');

export class APIRequestProcessor extends BaseRequestProcessor {
    /**
     * Make request
     * @param options
     */
    async makeRequest(options: request.OptionsWithUrl): Promise<any> {
        options.json = true;

        if (debug.enabled) {
            debug(`Making ${options.method} request for URL: ${options.url}`);

            if (options.qs) {
                debug(`Requer query parameters: ${JSON.stringify(options.qs)}`);
            }

            if (options.body) {
                debug(`Request body: ${JSON.stringify(options.qs)}`);
            }
        }

        await this.updateRequestOptions(options);

        return await new Promise<any>((resolve, reject) => {
            request(options, (error, response, body) => {
                if (debug.enabled) {
                    debug(`Response received. Status code: ${response.statusCode} Body: ${JSON.stringify(body)}`);
                }

                if (error) {
                    reject(error);
                } else {
                    if (response.statusCode >= 200 && response.statusCode <= 299) {
                        resolve(body);
                    } else {
                        reject(
                            new RequestError(
                                `${options.method} ${options.url} request failed. ${response.statusCode}: ${
                                    response.statusMessage
                                }`,
                                response,
                                body,
                            ),
                        );
                    }
                }
            });
        });
    }

    /**
     * Make GET request
     * @param path
     * @param [queryParameters]
     */
    async get(path: string, queryParameters?: { [key: string]: number | string | undefined }): Promise<any> {
        const kc = await this.loadConfig();

        const options: request.OptionsWithUrl = {
            method: 'GET',
            url: kc.cluster.cluster.server + path,
            qs: queryParameters,
        };

        return await this.makeRequest(options);
    }

    /**
     * Make POST request
     * @param path
     * @param body
     * @param [queryParameters]
     */
    async post(
        path: string,
        body: any,
        queryParameters?: { [key: string]: number | string | undefined },
    ): Promise<any> {
        const kc = await this.loadConfig();

        const options: request.OptionsWithUrl = {
            method: 'POST',
            url: kc.cluster.cluster.server + path,
            qs: queryParameters,
            body: body,
        };

        return await this.makeRequest(options);
    }

    /**
     * Make PUT request
     * @param path
     * @param body
     * @param [queryParameters]
     */
    async put(path: string, body: any, queryParameters?: { [key: string]: number | string | undefined }): Promise<any> {
        const kc = await this.loadConfig();

        const options: request.OptionsWithUrl = {
            method: 'PUT',
            url: kc.cluster.cluster.server + path,
            qs: queryParameters,
            body: body,
        };

        return await this.makeRequest(options);
    }

    /**
     * Make PATCH request (json patch).
     * If you want to just simple merge objects - use `merge` method instead.
     * @see https://tools.ietf.org/html/rfc6902
     * @param path
     * @param body
     * @param [queryParameters]
     */
    async patch(
        path: string,
        body: IPatchBodyItem[],
        queryParameters?: { [key: string]: number | string | undefined },
    ) {
        const kc = await this.loadConfig();

        const options: request.OptionsWithUrl = {
            method: 'PATCH',
            url: kc.cluster.cluster.server + path,
            qs: queryParameters,
            headers: {
                'content-type': 'application/json-patch+json',
            },
            body: body,
        };

        return await this.makeRequest(options);
    }

    /**
     * Make PATCH request (json merge)
     * @see https://tools.ietf.org/html/rfc7386
     * @param path
     * @param body
     * @param [queryParameters]
     */
    async merge(
        path: string,
        body: any,
        queryParameters?: { [key: string]: number | string | undefined },
    ): Promise<any> {
        const kc = await this.loadConfig();

        const options: request.OptionsWithUrl = {
            method: 'PATCH',
            url: kc.cluster.cluster.server + path,
            qs: queryParameters,
            headers: {
                'content-type': 'application/merge-patch+json',
            },
            body: body,
        };

        return await this.makeRequest(options);
    }

    /**
     * Make PATCH request
     * @param path
     * @param [queryParameters]
     */
    async delete(path: string, queryParameters?: { [key: string]: number | string | undefined }): Promise<any> {
        const kc = await this.loadConfig();

        const options: request.OptionsWithUrl = {
            method: 'DELETE',
            url: kc.cluster.cluster.server + path,
            qs: queryParameters,
        };

        return await this.makeRequest(options);
    }

    /**
     * Make k8s GET requests sequence to fetch all records
     * @param path
     * @param queryParameters
     */
    async getAll(
        path: string,
        queryParameters?: {
            limit?: number | string;
            continue?: string;
            [key: string]: number | string | undefined;
        },
    ): Promise<{ resourceVersion: string; items: any[] }> {
        debug(`GET request processor: getting all items for path: ${path} and queryParameters: ${queryParameters}`);
        if (!queryParameters) {
            queryParameters = {};
        }

        if (!queryParameters.limit) {
            queryParameters.limit = 100;
        }

        const result: { resourceVersion: string; items: any[] } = {
            resourceVersion: '',
            items: [],
        };

        let continueValue: string | undefined;

        let response;
        do {
            queryParameters.continue = continueValue;
            response = await this.get(path, queryParameters);

            result.items.push(...response.items);
            result.resourceVersion = response.metadata.resourceVersion;

            continueValue = response.metadata.continue;
        } while (continueValue && continueValue.length);

        return result;
    }
}
