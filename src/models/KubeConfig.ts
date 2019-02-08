import { IKubeConfigCluster, IKubeConfigContext, IKubeConfigUser } from '../interfaces';
import { readFile, exists } from 'fs';
import { promisify } from 'util';
import { homedir } from 'os';
import { join } from 'path';
import { safeLoad } from 'js-yaml';

import * as Debug from 'debug';
const debug = Debug('@fireblink/k8s-api-client');

export class KubeConfig {
    public static SA_ROOT = '/var/run/secrets/kubernetes.io/serviceaccount';
    public static SA_CA_PATH = KubeConfig.SA_ROOT + '/ca.crt';
    public static SA_TOKEN_PATH = KubeConfig.SA_ROOT + '/token';

    public user!: IKubeConfigUser;
    public cluster!: IKubeConfigCluster;

    /**
     * Load configuration from all posible sources
     */
    public async load(): Promise<void> {
        // load based on KUBECONFIG env var value
        /* istanbul ignore else */
        if (process.env.KUBECONFIG && process.env.KUBECONFIG.length > 0) {
            debug(`Loading kube configuration based on KUBECONFIG evn var: ${process.env.KUBECONFIG}`);
            await this.loadFromFile(process.env.KUBECONFIG);

            return;
        }

        // load based on default config file
        const defaultKubeConfig = join(homedir(), '.kube', 'config');
        const defaultKubeConfigExists = await promisify(exists)(defaultKubeConfig);
        /* istanbul ignore else */
        if (defaultKubeConfigExists) {
            debug(`Loading kube configuration from default location: ${defaultKubeConfig}`);
            await this.loadFromFile(defaultKubeConfig);

            return;
        }

        // load on pod (from serviceaccount folder)
        const tokenExists = await promisify(exists)(KubeConfig.SA_TOKEN_PATH);
        /* istanbul ignore else */
        if (tokenExists) {
            debug(`Loading kube configuration from service account.`);
            await this.loadFromServiceAccountToken();

            return;
        }

        throw new Error('Unable to load kube config');
    }

    /**
     * Load configuration from pod
     */
    public async loadFromServiceAccountToken(): Promise<void> {
        const host = process.env.KUBERNETES_SERVICE_HOST;
        const port = process.env.KUBERNETES_SERVICE_PORT;

        let scheme = 'https';
        if (port === '80' || port === '8080' || port === '8001') {
            scheme = 'http';
        }

        const token = await promisify(readFile)(KubeConfig.SA_TOKEN_PATH, 'utf8');
        debug(`token: ${token}`);

        this.user = {
            name: '',
            user: {
                token,
            },
        };
        debug(`user: ${JSON.stringify(this.user)}`);

        this.cluster = {
            name: '',
            cluster: {
                server: `${scheme}://${host}:${port}`,
                'certificate-authority': KubeConfig.SA_CA_PATH,
            },
        };
        debug(`cluster: ${JSON.stringify(this.user)}`);
    }

    /**
     * Load KubeConfig from file
     * @param path
     * @param currentContext override `current-context` value with custom one
     */
    public async loadFromFile(path: string, currentContext?: string): Promise<void> {
        debug(`Loading kube configuration from file: ${path}`);

        const yaml = await promisify(readFile)(path, 'utf8');
        const obj = safeLoad(yaml);

        if (obj.apiVersion !== 'v1') {
            throw new TypeError(
                `Unable to load config at path: ${path}; unknown api version specified: ${obj.apiVersion}.`,
            );
        }

        currentContext = currentContext || obj['current-context'];
        debug(`current-context: ${currentContext}`);
        if (!currentContext) {
            throw new Error(`Unable to load config at path: ${path}; no current-context field specified.`);
        }

        if (!obj.clusters) {
            throw new Error(`Unable to load config at path: ${path}; no clusters field specified.`);
        }

        if (!obj.contexts) {
            throw new Error(`Unable to load config at path: ${path}; no contexts field specified.`);
        }

        if (!obj.users) {
            throw new Error(`Unable to load config at path: ${path}; no users field specified.`);
        }

        const context: IKubeConfigContext = obj.contexts.find((c: IKubeConfigContext) => c.name === currentContext);
        if (!context) {
            throw new Error(`Unable to load config at path: ${path}; no matching context for name: ${currentContext}.`);
        }

        this.user = obj.users.find((u: IKubeConfigUser) => u.name === context.context.user);
        debug(`user: ${JSON.stringify(this.user)}`);
        if (!this.user) {
            throw new Error(
                `Unable to load config at path: ${path}; no matching user for name: ${context.context.user}.`,
            );
        }

        this.cluster = obj.clusters.find((c: IKubeConfigCluster) => c.name === context.context.cluster);
        debug(`cluster: ${JSON.stringify(this.user)}`);
        if (!this.cluster) {
            throw new Error(
                `Unable to load config at path: ${path}; no matching cluster for name: ${context.context.cluster}.`,
            );
        }
    }
}
