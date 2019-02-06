export interface IWatchRecord {
    type: 'added' | 'modified' | 'deleted';
    object: {
        metadata: {
            resourceVersion: string;
            [key: string]: any;
        };
        [key: string]: any;
    };
}
