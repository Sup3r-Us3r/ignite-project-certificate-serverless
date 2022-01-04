import { APIGatewayProxyHandler } from 'aws-lambda';

import { document } from 'src/utils/dynamodbClient';

const verifyCertificate: APIGatewayProxyHandler = async (event) => {
  try {
    const { id } = event.pathParameters;

    const response = await document.query({
      TableName: 'users_certificates',
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':id': id
      }
    }).promise();

    const userCertificate = response?.Items[0];

    if (userCertificate) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Valid certificate',
          name: userCertificate?.name,
          url: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION || ''}.amazonaws.com/${id}.pdf`
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      }
    }

    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Invalid certificate',
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    }
  } catch {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error on verify certificate',
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    }
  }
}

export const main = verifyCertificate;
