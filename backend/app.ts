#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { AmplifyGraphqlApi } from 'agqlac';
import * as path from 'path';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'TestStack');

/**
 * Function which we're referencing in the custom mutation.
 */
new lambda.NodejsFunction(stack, 'EchoFunction', {
  functionName: 'repeat',
  entry: path.join(__dirname, 'repeat.ts'),
});

const adminRole = iam.Role.fromRoleName(stack, 'adminRole', 'Admin'); // This is assuming you have an `Admin` role on your account

/**
 * Create an Api with a singel todo model that anybody using apiKey can perform full ops on.
 * A related blog/post set of models which allow only iam admins to update, but apiKey users can read only.
 * And a custom query which invokes the lambda defined above.
 */
new AmplifyGraphqlApi(stack, 'GraphqlApi', {
  schema: /* GraphQL */ `
    type Todo @model @auth(rules: [{ allow: public }]) {
      description: String!
      completed: Boolean
    }

    type Blog @model @auth(rules: [{ allow: public, operations: [read] }]) {
      title: String!
      description: String
      authors: [String]
      posts: [Post] @hasMany
    }

    type Post @model @auth(rules: [{ allow: public, operations: [read] }]) {
      title: String!
      content: [String]
      blog: Blog @belongsTo
    }

    type Query {
      repeatAfterMe(message: String): String @function(name: "repeat")
    }
  `,
  authorizationConfig: {
    defaultAuthMode: 'API_KEY',
    apiKeyConfig: {
      description: 'Api Key for public access',
      expires: cdk.Duration.days(30),
    },
    iamConfig: {
      authRole: adminRole,
      unauthRole: adminRole,
      adminRoles: [adminRole],
    }
  },
});
