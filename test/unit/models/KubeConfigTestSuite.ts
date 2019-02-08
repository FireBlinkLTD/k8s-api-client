import { suite, test } from 'mocha-typescript';
import * as assert from 'assert';
import { resolve } from 'path';
import { RESTRequestProcessor, IPatchBodyItem, KubeConfig } from '../../../src';
import { BaseTestSuite } from '../BaseTestSuite';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
export class KubeConfigTestSuite {
    private envKubeConfigValue?: string | undefined;

    before() {
        this.envKubeConfigValue = process.env.KUBECONFIG;
    }

    after() {
        process.env.KUBECONFIG = this.envKubeConfigValue;
    }

    async loadFromHome(): Promise<void> {
        const expected = new KubeConfig();
        await expected.load();        

        // cleanup env var
        process.env.KUBECONFIG = undefined;

        const actual = new KubeConfig();
        await actual.load();

        assert.deepStrictEqual(actual, expected);
    }
}
