import { handlerPath } from '@libs/handlerResolver';

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      http: {
        method: 'post',
        path: 'generateCertificate',
        cors: true
      }
    }
  ],
  iamRoleStatements: [
    {
      Effect: 'Allow',
      Action: [
        'dynamodb:Query',
        'dynamodb:PutItem'
      ],
      Resource: 'arn:aws:dynamodb:${self.provider.region}:*:table/users_certificates'
    }
  ]
};
