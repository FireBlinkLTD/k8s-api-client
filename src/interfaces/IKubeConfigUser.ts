export interface IKubeConfigUser {
    readonly name: string;

    readonly user: {
        readonly 'auth-provider'?: string;

        readonly 'client-certificate-data'?: string;
        readonly 'client-certificate'?: string;

        readonly 'client-key-data'?: string;
        readonly 'client-key'?: string;

        readonly token?: string;
        readonly 'token-file'?: string;

        readonly password?: string;
        readonly username?: string;
    };
}
