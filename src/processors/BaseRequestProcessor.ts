import { KubeConfig } from '../models';
import { promisify } from 'util';
import { readFile } from 'fs';
import * as request from 'request';

import * as Debug from 'debug';
const debug = Debug('@fireblink/k8s-api-client');

export abstract class BaseRequestProcessor {
    private kubeConfig!: KubeConfig;

    /**
     * Update kube config
     * @param kubeConfig
     */
    public updateConfig(kubeConfig: KubeConfig) {
        debug(`request processor: updating kube config with custom one: ${JSON.stringify(kubeConfig)}`);
        this.kubeConfig = kubeConfig;
    }

    /**
     * Load kube config
     */
    protected async loadConfig(): Promise<KubeConfig> {
        if (this.kubeConfig) {
            debug(`request processor: returning cached config`);

            return this.kubeConfig;
        }

        debug(`request processor: loading config`);
        const kc = new KubeConfig();
        await kc.load();
        this.kubeConfig = kc;

        return kc;
    }

    /**
     * Update request options based on kube config
     * @param options
     */
    protected async updateRequestOptions(options: request.Options): Promise<void> {
        debug(`request processor: updating request option based on kube config`);
        const kc = await this.loadConfig();

        if (kc.cluster.cluster['certificate-authority-data']) {
            options.ca = Buffer.from(kc.cluster.cluster['certificate-authority-data'], 'base64');
        } else if (kc.cluster.cluster['certificate-authority']) {
            options.ca = await promisify(readFile)(kc.cluster.cluster['certificate-authority']);
        }

        if (kc.user.user['client-certificate-data']) {
            options.cert = Buffer.from(kc.user.user['client-certificate-data'], 'base64');
        } else if (kc.user.user['client-certificate']) {
            options.cert = await promisify(readFile)(kc.user.user['client-certificate']);
        }

        if (kc.user.user['client-key-data']) {
            options.key = Buffer.from(kc.user.user['client-key-data'], 'base64');
        } else if (kc.user.user['client-key']) {
            options.key = await promisify(readFile)(kc.user.user['client-key']);
        }

        if (kc.user.user.token) {
            if (!options.headers) {
                options.headers = {};
            }
            options.headers.Authorization = 'Bearer ' + kc.user.user.token;
        }

        if (kc.cluster.cluster['insecure-skip-tls-verify']) {
            options.rejectUnauthorized = false;
        }

        if (kc.user.user.username && kc.user.user.password) {
            options.auth = {
                username: kc.user.user.username,
                password: kc.user.user.password,
            };
        }
    }
}
