export interface IKubeConfigCluster {
    readonly name: string;
    readonly cluster: {
        readonly server: string;
        readonly 'certificate-authority-data'?: string;
        readonly 'certificate-authority'?: string;
        readonly 'insecure-skip-tls-verify'?: boolean;
    };
}
