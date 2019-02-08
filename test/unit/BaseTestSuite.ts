import { promisify } from 'util';
import { readFile } from 'fs';
import { safeLoad } from 'js-yaml';
import { exec } from 'child_process';

export class BaseTestSuite {
    /**
     * Execute command
     * @param path
     */
    protected async exec(cmd: string): Promise<{ stdout: string; stderr: string }> {
        return await new Promise<{ stdout: string; stderr: string }>((res, rej) =>
            exec(cmd, (err, stdout, stderr) => {
                /* istanbul ignore next */
                if (err) {
                    return rej(err);
                }

                res({
                    stdout,
                    stderr,
                });
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
