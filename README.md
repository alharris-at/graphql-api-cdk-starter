# Getting Started

Deploy the backend once:

* CDK Bootstrap your dev account/region https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html
* Install Amplify CLI version <= 12.0.1 `npm i -g @aws-amplify/cli@12.0.1`
* checkout this repo: `git clone https://github.com/alharris-at/graphql-api-cdk-starter`
* install deps `npm i`
* run an initial backend deploy `npm run deploy`
* generate the client config `npm run generate`

Enable more iterative deploys

* `npm start`  this will trigger the app to run, as well as cdk watch

To run codegen and refresh client interfaces

* `npm run generate`
