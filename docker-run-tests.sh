#!/bin/bash

if [[ $KIND_USE_EXISTING_CLUSTER == 0 ]]; then
    echo "-> removing kind cluster..."
    kind delete cluster

    echo "-> creating kind cluster..."
    kind create cluster

    exit_code=$?
    if [[ $exit_code != 0 ]]; then
        echo "<- failed to create kind cluster"
        exit $exit_code
    fi
fi

if [[ -z "$KUBECONFIG" ]]; then
    # export kube config
    export KUBECONFIG="$(kind get kubeconfig-path)"
fi

# copy kubeconfig into default location for test purposes
cp $KUBECONFIG ~/.kube/config

if [[ -n "$KIND_COPY_KUBECONFIG_TO" ]]; then
    cp $KUBECONFIG $KIND_COPY_KUBECONFIG_TO
fi

# navigate to project dir
cd /usr/app

echo "-> apply k8s resource definitions"
kubectl apply -f test/assets/k8s/resourcedefinition-get.yml
kubectl apply -f test/assets/k8s/resourcedefinition-watch.yml

echo "-> running tests..."
export DEBUG='@fireblink/k8s-api-client'
yarn test
exit_code=$?

if [[ $KIND_KEEP_GENERATED_CLUSTER == 0 ]]; then
    echo "-> removing kind cluster..."
    kind delete cluster

    echo "-> building ./coverage/coverage.lcov report file..."
    ./node_modules/.bin/nyc report --reporter=text-lcov > ./coverage/coverage.lcov
fi

exit $exit_code