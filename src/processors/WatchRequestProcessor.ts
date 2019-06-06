import * as request from 'request';
import { JsonStreamReader } from 'json-streaming-reader';

import { BaseRequestProcessor } from './BaseRequestProcessor';

import * as Debug from 'debug';
import { RequestError } from '../models';
const debug = Debug('@fireblink/k8s-api-client');

export type WatchHandler = (obj: any) => Promise<void>;

export interface IWatchHandlers {
    added?: WatchHandler;
    modified?: WatchHandler;
    deleted?: WatchHandler;
}

export class WatchRequestProcessor extends BaseRequestProcessor {
    private activeRequest?: any;
    private aborted = false;

    /**
     * Abort active watch request
     */
    abort(): void {
        if (this.activeRequest) {
            this.aborted = true;
            this.activeRequest.abort();
            this.activeRequest = undefined;
        }
    }

    /**
     * Establish long polling request to monitor k8s resources
     * @param path
     * @param handlers
     * @param resourceVersion
     */
    async watch(path: string, handlers: IWatchHandlers, resourceVersion?: string): Promise<void> {
        debug(`WATCH request processor: start watching path: ${path} and resourceVersion: ${resourceVersion}`);

        const kc = await this.loadConfig();

        const options: request.Options = {
            url: kc.cluster.cluster.server + path,
            method: 'GET',
            headers: {},
            qs: {},
        };

        await this.updateRequestOptions(options);

        options.qs.watch = 'true';
        if (resourceVersion) {
            options.qs.resourceVersion = resourceVersion;
        }

        this.activeRequest = undefined;
        try {
            await new Promise((res, rej) => {
                let queue = Promise.resolve();
                const stream = request(options);

                const jsonStream = new JsonStreamReader();
                stream.pipe(jsonStream);

                jsonStream.on('data', (data: any) => {
                    const record = data.record;

                    const emit = (handler: WatchHandler): void => {
                        jsonStream.pause();
                        queue = queue.then(() => {
                            return handler(record.object)
                                .then(() => {
                                    resourceVersion = record.object.metadata.resourceVersion;
                                    jsonStream.resume();
                                })
                                .catch(err => {
                                    this.abort();
                                    rej(err);
                                });
                        });
                    };

                    if (record.kind && record.kind.toLowerCase() === 'status') {
                        if (record.status && record.status.toLowerCase() === 'failure') {
                            this.aborted = true;
                            rej(record.message);
                        }
                    }

                    if (record.type) {
                        const type: string = record.type.toLowerCase();
                        if (type === 'added' || type === 'modified' || type === 'deleted') {
                            const handler: WatchHandler | undefined = handlers[type];
                            if (handler) {
                                emit(handler);
                            }
                        }
                    }
                });

                jsonStream.on('finish', () => {
                    if (response && response.statusCode >= 400) {
                        rej(new RequestError('Request failed', response));
                    }

                    res();
                });

                stream.on('request', req => {
                    this.activeRequest = req;
                });

                let response: request.Response;
                stream.on('response', resp => {
                    response = resp;
                });
            });
        } finally {
            this.activeRequest = undefined;
        }

        if (!this.aborted) {
            // connection polling may break due to timeout
            // we need to make sure we reconnect if that happens
            setTimeout(() => {
                this.watch(path, handlers, resourceVersion);
            }, 0);
        }
    }
}
