import * as path from 'path';
import * as fs from 'fs';
import * as process from 'process';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { AppSyncClient, GetIntrospectionSchemaCommand, OutputType } from '@aws-sdk/client-appsync';
import { spawn } from 'child_process';

const schemaJsonPath = path.join(process.cwd(), 'schema.json');
const appConfigPath = path.join(process.cwd(), 'src', 'appConfig.ts');

const writeAppConfig = ({ apiKey, graphqlUrl }) => {
  const template = `const appConfig = {
    aws_appsync_graphqlEndpoint: '${graphqlUrl}',
    aws_appsync_authenticationType: 'API_KEY',
    aws_appsync_apiKey: '${apiKey}',  
  };
    
  export default appConfig;
  `;
  fs.writeFileSync(appConfigPath, template);
};

const getApiConfig = async () => {
  const results = await new CloudFormationClient().send(new DescribeStacksCommand({}));
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
  const results = await new AppSyncClient().send(new GetIntrospectionSchemaCommand({
    apiId,
    format: OutputType.JSON,
    includeDirectives: false,
  }));
  if (!results.schema) {
    throw new Error(`Did not find schema for api with id ${apiId}`);
  }
  fs.writeFileSync(schemaJsonPath, results.schema);
};

const invokeCodegen = async (apiId) => {
  const codegen = spawn('amplify', ['codegen', '--apiId', apiId]);

  codegen.stdout.on('data', (data) => {
    console.info(`codegen: ${data}`);
  });

  codegen.stderr.on('data', (data) => {
    console.error(`codegen: ${data}`);
  });

  codegen.on('close', (code) => {
    console.log(`child process close all stdio with code ${code}`);
  });
  
  codegen.on('exit', (code) => {
    console.log(`child process exited with code ${code}`);
  });

  codegen.on('disconnect', () => {
    console.log(`child process disconnected`);
  });
};

const generate = async () => {
  try {
    console.log('[ 1 / 4 ] Pulling Api Config');
    const { apiId, graphqlUrl, apiKey } = await getApiConfig();
    console.log('[ 2 / 4 ] Downloading Introspection Schema');
    await downloadInstrospectionSchema(apiId);
    console.log('[ 3 / 4 ] Invoking Amplify Codegen');
    await invokeCodegen(apiId);
    console.log('[ 4 / 4 ] Writing App Config');
    await writeAppConfig({ graphqlUrl, apiKey })
    process.exit(0);
  } catch (e) {
    console.error('Caught exception while executing generate script', e);
    process.exit(1);
  }
};

generate();
