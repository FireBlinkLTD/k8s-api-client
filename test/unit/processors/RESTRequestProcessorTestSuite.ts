import { suite, test } from 'mocha-typescript';
import * as assert from 'assert';
import { resolve } from 'path';
import { RESTRequestProcessor, IPatchBodyItem } from '../../../src';
import { BaseTestSuite } from '../BaseTestSuite';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class RESTRequestProcessorTestSuite extends BaseTestSuite {
    async after(): Promise<void> {
        await this.exec('kubectl delete --all get');    
    }

    private async applyResource(path: string): Promise<void> {
        await this.exec(`kubectl apply -f "${path}"`);        
    }

    private async getResource(kind: string, name: string): Promise<any> {
        const {stdout} = await this.exec(`kubectl get ${kind} ${name} -o json`);
        
        return JSON.parse(stdout);
    }

    @test()
    async getOne(): Promise<void> {
        const processor = new RESTRequestProcessor();

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
    async delete(): Promise<void> {
        const processor = new RESTRequestProcessor();

        const resourcePath = resolve(process.cwd(), 'test', 'assets', 'k8s', 'resource-get.yml');
        const resource = await this.readYamlFile(resourcePath);

        await this.applyResource(resourcePath);

        const namespace = 'default';
        await processor.delete(
            `/apis/${resource.apiVersion}/namespaces/${namespace}/gets/${resource.metadata.name}`        
        );

        await chai.expect(
            this.getResource('gets', resource.metadata.name)
        ).to.rejectedWith('Command failed');        
    }

    @test()
    async post(): Promise<void> {
        const processor = new RESTRequestProcessor();

        const resourcePath = resolve(process.cwd(), 'test', 'assets', 'k8s', 'resource-get.yml');
        const resource = await this.readYamlFile(resourcePath);

        const namespace = 'default';
        await processor.post(
            `/apis/${resource.apiVersion}/namespaces/${namespace}/gets`,
            resource
        );

        const result = await this.getResource('gets', resource.metadata.name);

        assert.strictEqual(result.apiVersion, resource.apiVersion);
        assert.strictEqual(result.kind, resource.kind);
        assert.deepStrictEqual(result.spec, resource.spec);
    }

    @test()
    async put(): Promise<void> {
        const processor = new RESTRequestProcessor();

        const resourcePath = resolve(process.cwd(), 'test', 'assets', 'k8s', 'resource-get.yml');
        await this.applyResource(resourcePath);

        const resourceUpdatePath = resolve(process.cwd(), 'test', 'assets', 'k8s', 'resource-get-update.yml');
        const resourceUpdate = await this.readYamlFile(resourceUpdatePath);

        let result = await this.getResource('gets', resourceUpdate.metadata.name);
        resourceUpdate.metadata.resourceVersion = result.metadata.resourceVersion;

        const namespace = 'default';
        await processor.put(
            `/apis/${resourceUpdate.apiVersion}/namespaces/${namespace}/gets/${resourceUpdate.metadata.name}`,
            resourceUpdate
        );

        result = await this.getResource('gets', resourceUpdate.metadata.name);

        assert.strictEqual(result.apiVersion, resourceUpdate.apiVersion);
        assert.strictEqual(result.kind, resourceUpdate.kind);
        assert.deepStrictEqual(result.spec, resourceUpdate.spec);
    }

    @test()
    async patch(): Promise<void> {
        const processor = new RESTRequestProcessor();

        const resourcePath = resolve(process.cwd(), 'test', 'assets', 'k8s', 'resource-get.yml');
        const resource = await this.readYamlFile(resourcePath);
        await this.applyResource(resourcePath);

        let result = await this.getResource('gets', resource.metadata.name);
        const resourceUpdate: IPatchBodyItem[] = [{
            op: 'add',
            path: '/spec/newItem',
            value: 'yes'
        }];        
        
        const namespace = 'default';
        await processor.patch(
            `/apis/${resource.apiVersion}/namespaces/${namespace}/gets/${resource.metadata.name}`,
            resourceUpdate
        );

        result = await this.getResource('gets', resource.metadata.name);

        assert.strictEqual(result.apiVersion, resource.apiVersion);
        assert.strictEqual(result.kind, resource.kind);
        assert.deepStrictEqual(result.spec, Object.assign({}, resource.spec, {
            newItem: 'yes'
        }));
    }

    @test()
    async merge(): Promise<void> {
        const processor = new RESTRequestProcessor();

        const resourcePath = resolve(process.cwd(), 'test', 'assets', 'k8s', 'resource-get.yml');
        const resource = await this.readYamlFile(resourcePath);
        await this.applyResource(resourcePath);

        let result = await this.getResource('gets', resource.metadata.name);
        const resourceUpdate = {
            metadata: {
                resourceVersion: result.metadata.resourceVersion
            },
            spec: {
                newItem: 'yes'
            }
        };
        
        const namespace = 'default';
        await processor.merge(
            `/apis/${resource.apiVersion}/namespaces/${namespace}/gets/${resource.metadata.name}`,
            resourceUpdate
        );

        result = await this.getResource('gets', resource.metadata.name);

        assert.strictEqual(result.apiVersion, resource.apiVersion);
        assert.strictEqual(result.kind, resource.kind);
        assert.deepStrictEqual(result.spec, Object.assign({}, resource.spec, resourceUpdate.spec));
    }

    @test()
    async getAll(): Promise<void> {
        const processor = new RESTRequestProcessor();

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
