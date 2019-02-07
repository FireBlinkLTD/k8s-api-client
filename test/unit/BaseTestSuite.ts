import { promisify } from 'util';
import { readFile } from 'fs';
import { safeLoad } from 'js-yaml';
import { exec } from 'child_process';

export class BaseTestSuite {

    /**
     * Execute command
     * @param path 
     */
    protected async exec(cmd: string): Promise<void> {
        await new Promise<void>((res, rej) =>
            exec(cmd, err => {
                /* istanbul ignore next */
                if (err) {
                    return rej(err);
                }

                res();
            }),
        );
    }
    
    /**
     * Read yaml file
     * @param path 
     */
    protected async readYamlFile(path: string): Promise<any> {
        const content = await promisify(readFile)(path, 'utf8');
        
        return safeLoad(content);
    }
}
