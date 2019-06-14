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

interface IWatchEventRecord {
    type: string;
    status: string;
    message?: string;
    kind: string;
    object: any;
}

export class WatchRequestProcessor extends BaseRequestProcessor {
    private activeRequest?: any;
    private aborted = false;
    private resourseVersion?: string;

    /**
     * Abort active watch request
     */
    abort(): void {
        this.aborted = true;

        if (this.activeRequest) {
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
    private async makeWatchRequest(path: string, handle: (record: IWatchEventRecord) => Promise<void>): Promise<void> {
        if (this.aborted) {
            throw new Error('Unable to watch. Processor already aborted.');
        }

        debug(`WATCH request processor - start watching path: ${path} and resourceVersion: ${this.resourseVersion}`);

        const kc = await this.loadConfig();

        const options: request.Options = {
            url: kc.cluster.cluster.server + path,
            method: 'GET',
            headers: {},
            qs: {},
        };

        await this.updateRequestOptions(options);

        options.qs.watch = 'true';
        if (this.resourseVersion) {
            options.qs.resourceVersion = this.resourseVersion;
        }

        this.activeRequest = undefined;
        try {
            await new Promise((res, rej) => {
                const stream = request(options);
                const jsonStream = new JsonStreamReader();
                stream.pipe(jsonStream);

                stream.on('error', err => {
                    this.abort();
                    rej(err);
                });

                jsonStream.on('data', (data: any) => {
                    const record: IWatchEventRecord = data.record;

                    if (record.kind && record.kind.toLowerCase() === 'status') {
                        if (record.status && record.status.toLowerCase() === 'failure') {
                            jsonStream.pause();
                            this.abort();
                            rej(new Error(record.message));

                            return;
                        }
                    }

                    if (record.type) {
                        jsonStream.pause();
                        this.resourseVersion = record.object.metadata.resourceVersion;
                        handle(record).then(
                            () => {
                                jsonStream.resume();
                            },
                            err => {
                                this.abort();
                                rej(err);
                            },
                        );
                    }
                });

                stream.on('request', req => {
                    this.activeRequest = req;
                });

                let response: request.Response;
                stream.on('response', resp => {
                    debug(`WATCH request processor - received response for path: ${path}`);
                    response = resp;
                });

                jsonStream.on('finish', () => {
                    debug(`WATCH request processor - finished watching for path: ${path}`);
                    if (!response) {
                        rej(new RequestError('Request failed'));

                        return;
                    }

                    if (response.statusCode >= 400) {
                        rej(new RequestError('Request failed', response));

                        return;
                    }

                    res();
                });
            });
        } finally {
            debug(`WATCH request processor - finished watching path: ${path}`);
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
        this.resourseVersion = resourceVersion;
        const handle = async (record: IWatchEventRecord): Promise<void> => {
            const type: string = record.type.toLowerCase();
            debug(`Received record with type: ${type}`);
            if (type === 'added' || type === 'modified' || type === 'deleted') {
                const handler: WatchHandler | undefined = handlers[type];
                if (handler) {
                    await handler(record.object);
                }
            }
        };

        while (!this.aborted) {
            await this.makeWatchRequest(path, handle);
        }
    }
}
