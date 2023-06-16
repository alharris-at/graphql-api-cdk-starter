import * as path from 'path';
import * as fs from 'fs';
import * as process from 'process';
import * as cfn from '@aws-sdk/client-cloudformation';
import * as appsync from '@aws-sdk/client-appsync';
import * as pty from 'child_process';

const schemaJsonPath = path.join(process.cwd(), 'schema.json');

const writeAppConfig = ({ apiKey, graphqlUrl }) => {
  const template = `const appConfig = {
    aws_appsync_graphqlEndpoint: '${graphqlUrl}',
    aws_appsync_authenticationType: 'API_KEY',
    aws_appsync_apiKey: '${apiKey}',  
  };
    
  export default appConfig;
  `;
  fs.writeFileSync(path.join(process.cwd(), 'src', 'appConfig.ts'), template);
};

const writeGraphQLConfig = (apiId) => {
  const template = `projects:
  Codegen Project:
    schemaPath: schema.json
    includes:
      - src/graphql/**/*.ts
    excludes:
      - ./amplify/**
    extensions:
      amplify:
        codeGenTarget: typescript
        generatedFileName: src/API.ts
        docsFilePath: src/graphql
        region: us-east-1
        apiId: ${apiId}
        frontend: javascript
        framework: react
        maxDepth: 2
extensions:
  amplify:
    version: 3
`;
fs.writeFileSync(path.join(process.cwd(), '.graphqlconfig.yml'), template);
};

const getApiConfig = async () => {
  const results = await new cfn.CloudFormationClient().send(new cfn.DescribeStacksCommand({}));
  const stack = results.Stacks.filter(stack => stack.StackName === 'TestStack')[0];
  const apiKeyOutputs = stack.Outputs.filter(output => output.OutputKey === 'GraphQLAPIKeyOutput');
  const graphqlurlOutputs = stack.Outputs.filter(output => output.OutputKey === 'GraphQLAPIEndpointOutput');
  const apiIdOutputs = stack.Outputs.filter(output => output.OutputKey === 'GraphQLAPIIdOutput');
  return {
    ...(apiKeyOutputs.length === 1 ? { apiKey: apiKeyOutputs[0].OutputValue } : {}),
    ...(graphqlurlOutputs.length === 1 ? { graphqlUrl: graphqlurlOutputs[0].OutputValue } : {}),
    ...(apiIdOutputs.length === 1 ? { apiId: apiIdOutputs[0].OutputValue } : {}),
  };
};

const downloadInstrospectionSchema = async (apiId) => {
  const results = await new appsync.AppSyncClient().send(new appsync.GetIntrospectionSchemaCommand({
    apiId,
    format: appsync.OutputType.JSON,
    includeDirectives: false,
  }));
  if (!results.schema) {
    throw new Error(`Did not find schema for api with id ${apiId}`);
  }
  fs.writeFileSync(schemaJsonPath, results.schema);
};

const invokeCodegen = (apiId) => new Promise((resolve) => {
  const codegen = pty.spawn('amplify', ['codegen', '--apiId', ['codegen', '--apiId', apiId]]);

  codegen.stdout.on('data', (data) => {
    console.info(`codegen: ${data}`);
  });

  codegen.stderr.on('data', (data) => {
    console.error(`codegen: ${data}`);
  });

  codegen.on('close', (code) => {
    console.log(`child process close all stdio with code ${code}`);
    resolve();
  });
  
  codegen.on('exit', (code) => {
    console.log(`child process exited with code ${code}`);
    resolve();
  });

  codegen.on('disconnect', () => {
    console.log(`child process disconnected`);
    resolve();
  });
});

const generate = async () => {
  try {
    console.log('[ 1 / 5 ] Pulling Api Config');
    const { apiId, graphqlUrl, apiKey } = await getApiConfig();
    console.log('[ 2 / 5 ] Downloading Introspection Schema');
    await downloadInstrospectionSchema(apiId);
    console.log('[ 3 / 5 ] Generating GraphQL Config');
    writeGraphQLConfig(apiId)
    console.log('[ 4 / 5 ] Invoking Amplify Codegen');
    await invokeCodegen(apiId);
    console.log('[ 5 / 5 ] Writing App Config');
    writeAppConfig({ graphqlUrl, apiKey })
    process.exit(0);
  } catch (e) {
    console.error('Caught exception while executing generate script', e);
    process.exit(1);
  }
};

generate();
