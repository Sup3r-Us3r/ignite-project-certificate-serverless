import type { AWS } from '@serverless/typescript';

import generateCertificate from '@functions/generateCertificate';
import verifyCertificate from '@functions/verifyCertificate';

const serverlessConfiguration: AWS = {
  service: 'certificate',
  frameworkVersion: '2',
  plugins: [
    'serverless-esbuild',
    'serverless-offline',
    'serverless-dynamodb-local',
    'serverless-dotenv-plugin'
  ],
  provider: {
    name: 'aws',
    runtime: 'nodejs14.x',
    region: 'sa-east-1',
    lambdaHashingVersion: '20201221',
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: ['dynamodb:*'],
        Resource: '*'
      },
      {
        Effect: 'Allow',
        Action: ['s3:*'],
        Resource: '*'
      }
    ]
  },
  // import the function via paths
  functions: { generateCertificate, verifyCertificate },
  package: {
    individually: false,
    patterns: [
      './src/templates/**'
    ]
  },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk'],
      target: 'node14',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10,
      external: [
        'chrome-aws-lambda'
      ],
    },
    dynamodb: {
      stages: ['dev', 'prod'],
      start: {
        port: 8000,
        inMemory: true,
        migrate: true,
      }
    }
  },
  resources: {
    Resources: {
      dbCertificatesUsers: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          TableName: 'users_certificates',
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
          AttributeDefinitions: [
            {
              AttributeName: 'id',
              AttributeType: 'S',
            }
          ],
          KeySchema: [
            {
              AttributeName: 'id',
              KeyType: 'HASH',
            }
          ]
        }
      }
    },
  },
};

module.exports = serverlessConfiguration;
