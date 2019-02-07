import { suite, test } from 'mocha-typescript';
import * as assert from 'assert';
import { resolve } from 'path';
import { GetRequestProcessor } from '../../../src';
import { BaseTestSuite } from '../BaseTestSuite';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class GetRequestProcessorTestSuite extends BaseTestSuite {
    async after(): Promise<void> {
        await this.exec('kubectl delete --all get');    
    }

    private async applyResource(path: string): Promise<void> {
        await this.exec(`kubectl apply -f "${path}"`);        
    }

    @test()
    async getOne(): Promise<void> {
        const processor = new GetRequestProcessor();

        const resourcePath = resolve(process.cwd(), 'test', 'assets', 'k8s', 'resource-get.yml');

        const resource = await this.readYamlFile(resourcePath);

        await this.applyResource(resourcePath);
        
        const namespace = 'default';
        const result = await processor.get(
            `/apis/${resource.apiVersion}/namespaces/${namespace}/gets/${resource.metadata.name}`        
        );

        assert.strictEqual(result.apiVersion, resource.apiVersion);
        assert.strictEqual(result.kind, resource.kind);
        assert.deepStrictEqual(result.spec, resource.spec);
    }

    @test()
    async getAll(): Promise<void> {
        const processor = new GetRequestProcessor();

        const resource1Path = resolve(process.cwd(), 'test', 'assets', 'k8s', 'resource-get.yml');
        const resource1uPath = resolve(process.cwd(), 'test', 'assets', 'k8s', 'resource-get-update.yml');
        const resource2Path = resolve(process.cwd(), 'test', 'assets', 'k8s', 'resource-get2.yml');

        const resource1u = await this.readYamlFile(resource1uPath);
        const resource2 = await this.readYamlFile(resource2Path);

        await this.applyResource(resource1Path);
        await this.applyResource(resource1uPath);
        await this.applyResource(resource2Path);
        
        const namespace = 'default';
        const result = await processor.getAll(
            `/apis/${resource1u.apiVersion}/namespaces/${namespace}/gets`,
            {
                limit: 1
            }  
        );

        assert(result.resourceVersion);
        assert.strictEqual(result.items.length, 2);
        
        for (const resource of [resource1u, resource2]) {
            const actual = result.items.find(i => i.metadata.name === resource.metadata.name);
            
            assert(actual);
            assert.strictEqual(actual.apiVersion, resource.apiVersion);
            assert.strictEqual(actual.kind, resource.kind);
            assert.deepStrictEqual(actual.spec, resource.spec);
        }
    }
}
