export type PatchBodyOpType = 'add' | 'remove' | 'replace' | 'copy' | 'move' | 'test';

export interface IPatchBodyItem {
    op: PatchBodyOpType;
    path: string;
    from?: string | undefined;
    value?: any;
}
