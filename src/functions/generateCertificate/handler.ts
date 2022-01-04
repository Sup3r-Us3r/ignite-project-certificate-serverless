import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import chromium from 'chrome-aws-lambda';
import { readFileSync } from 'fs';
import { join } from 'path';
import handlebars from 'handlebars';
import dayjs from 'dayjs';

import { document } from '../../utils/dynamodbClient';

interface ICreateCertificate {
  id: string;
  name: string;
  grade: string;
}

interface ITemplate {
  id: string;
  name: string;
  grade: string;
  date: string;
  medal: string;
}

async function compile(variables: ITemplate) {
  const filePath = join(
    process.cwd(),
    'src',
    'templates',
    'certificate',
    'certificate.hbs'
  );
  const templateFileContent = readFileSync(filePath, 'utf8');
  const templateParse = handlebars.compile(templateFileContent);

  return templateParse(variables);
}

const generateCertificate: APIGatewayProxyHandler = async (event) => {
  try {
    const { id, name, grade } = JSON.parse(event.body) as ICreateCertificate;

    const response = await document.query({
      TableName: 'users_certificates',
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':id': id
      }
    }).promise();

    const userAlreadyExists = response?.Items[0];

    if (!userAlreadyExists) {
      await document.put({
        TableName: 'users_certificates',
        Item: {
          id,
          name,
          grade
        }
      }).promise();
    }

    const medalPath = join(
      process.cwd(),
      'src',
      'templates',
      'certificate',
      'medal.png'
    );
    const medal = readFileSync(medalPath, 'base64');

    const data: ITemplate = {
      id,
      name,
      grade,
      medal,
      date: dayjs().format('DD/MM/YYYY')
    };

    const content = await compile(data);

    const browser = await chromium.puppeteer.launch({
      headless: true,
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
    });

    const page = await browser.newPage();

    await page.setContent(content);

    const pdf = await page.pdf({
      format: 'a4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      path: process.env.IS_OFFLINE ? 'certificate.pdf' : null
    });

    await browser.close();

    if (!process.env.IS_OFFLINE) {
      const s3 = new S3();

      await s3.putObject({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: `${id}.pdf`,
        ACL: 'public-read',
        ContentType: 'application/pdf',
        Body: pdf,
      }).promise();
    }

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Certificate created!',
        url: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION || ''}.amazonaws.com/${id}.pdf`
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    }
  } catch {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error generating certificate',
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    }
  }
}

export const main = generateCertificate;
