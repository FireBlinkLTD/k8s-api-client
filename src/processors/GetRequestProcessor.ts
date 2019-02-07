import * as request from 'request';

import { BaseRequestProcessor } from './BaseRequestProcessor';

import * as Debug from 'debug';
const debug = Debug('@fireblink/k8s-api-client')

export class GetRequestProcessor extends BaseRequestProcessor {
    /**
     * Make k8s GET request for given path
     * @param path
     * @param [queryParameters]     
     */
    async get(
        path: string, 
        queryParameters?: { [key: string]: number | string | undefined }
    ): Promise<any> {
        debug(`GET request processor: making GET request for path: ${path} and queryParameters: ${queryParameters}`);        
        const kc = await this.loadConfig();
        
        const options: request.Options = {
            json: true,
            method: 'GET',
            url: kc.cluster.cluster.server + path,
            headers: {},
            qs: queryParameters
        };

        await this.updateRequestOptions(options);

        return new Promise<any>((resolve, reject) => {
            request(options, (error, response, body) => {
                if (error) {
                    reject(error);
                } else {
                    if (response.statusCode >= 200 && response.statusCode <= 299) {
                        resolve(body);
                    } else {
                        reject(new Error(`Response failed. ${response.statusCode}: ${response.statusMessage}. Body: ${body}`));
                    }
                }
            });
        });
    }

    /**
     * Make k8s GET requests sequence to fetch all records
     * @param path 
     * @param queryParameters     
     */
    async getAll(
        path: string,
        queryParameters?: { 
            limit?: number | string,
            continue?: string,
            [key: string]: number | string | undefined
        }
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
