import { suite, test } from 'mocha-typescript';
import * as assert from 'assert';
import { resolve } from 'path';
import { WatchRequestProcessor } from '../../../src';
import { BaseTestSuite } from '../BaseTestSuite';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);


@suite()
class WatchActionHandlerTestSuite extends BaseTestSuite {
    async after(): Promise<void> {
        await this.exec('kubectl delete --all watchs');    
    }

    private async applyResource(path: string): Promise<void> {
        await this.exec(`kubectl apply -f "${path}"`);        
    }

    private async deleteResource(name: string): Promise<void> {
        await this.exec(`kubectl delete watch ${name}`);        
    }

    @test()
    async passExecution(): Promise<void> {
        const processor = new WatchRequestProcessor();
        
        const added: any[] = [];
        const modified: any[] = [];
        const deleted: any[] = [];
        
        const resourcePath = resolve(process.cwd(), 'test', 'assets', 'k8s', 'resource-watch.yml');
        const resourceUpdatePath = resolve(process.cwd(), 'test', 'assets', 'k8s', 'resource-watch-update.yml');
                
        const resource = await this.readYamlFile(resourcePath);
        const resourceUpdated = await this.readYamlFile(resourceUpdatePath);        

        await this.applyResource(resourcePath);

        await processor.watch(
            `/apis/${resource.apiVersion}/namespaces/default/watchs`,
            {                
                added: async (obj: any): Promise<void> => {
                    added.push(obj);
                    await this.applyResource(resourceUpdatePath);
                },

                deleted: async (obj: any): Promise<void> => {
                    deleted.push(obj);
                    processor.abort();
                },

                modified: async (obj: any): Promise<void> => {
                    modified.push(obj);
                    await this.deleteResource(resource.metadata.name);
                }
            }
        );
        
        assert.strictEqual(added.length, 1);        
        assert.strictEqual(added[0].apiVersion, resource.apiVersion);
        assert.strictEqual(added[0].kind, resource.kind);
        assert.deepStrictEqual(added[0].spec, resource.spec);

        assert.strictEqual(modified.length, 1);
        assert.strictEqual(modified[0].apiVersion, resourceUpdated.apiVersion);
        assert.strictEqual(modified[0].kind, resourceUpdated.kind);
        assert.deepStrictEqual(modified[0].spec, resourceUpdated.spec);

        assert.strictEqual(deleted.length, 1);
        assert.strictEqual(deleted[0].apiVersion, resourceUpdated.apiVersion);
        assert.strictEqual(deleted[0].kind, resourceUpdated.kind);
        assert.deepStrictEqual(deleted[0].spec, resourceUpdated.spec);
    }

    @test()
    async error(): Promise<void> {
        const processor = new WatchRequestProcessor();
        
        const resourcePath = resolve(process.cwd(), 'test', 'assets', 'k8s', 'resource-watch.yml');
        const resource = await this.readYamlFile(resourcePath);
        
        await this.applyResource(resourcePath);

        await chai.expect(
            processor.watch(
                `/apis/${resource.apiVersion}/namespaces/default/watchs`,
                {                                    
                },
                '-1'
            )
        ).to.be.rejectedWith('resourceVersion: Invalid value: "-1": strconv.ParseUint: parsing "-1": invalid syntax');        
    }
}
