export interface IKubeConfigContext {
    readonly name: string;
    readonly context: {
        readonly cluster: string;
        readonly user: string;
    };
}
