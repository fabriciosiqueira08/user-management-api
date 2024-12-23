import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  AuthFlowType,
  RespondToAuthChallengeCommand,
  ChallengeNameType,
} from "@aws-sdk/client-cognito-identity-provider";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { authenticator } from "otplib";
import { getSecret } from "../utils/secretsManager";

const cognitoClient = new CognitoIdentityProviderClient({
  region: "us-east-1",
});

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const initiateAuth = async (email: string, password: string) => {
  const params = {
    AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
    ClientId: process.env.USER_POOL_CLIENT_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  };

  const command = new InitiateAuthCommand(params);
  return await cognitoClient.send(command);
};

export const generateOTP = async (): Promise<string> => {
  const secret = await getSecret("OTP_SECRET");
  return authenticator.generate(secret);
};

export const storeOTP = async (email: string, otp: string) => {
  const params = {
    TableName: process.env.OTP_TABLE,
    Item: {
      email,
      otp,
      expiresAt: Math.floor(Date.now() / 1000) + 300, // 5 minutos
    },
  };

  await dynamoClient.send(new PutCommand(params));
};
export const sendOTPEmail = async (email: string, otp: string) => {
  const params = {
    Source: process.env.SENDER_EMAIL,
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: "Seu código de verificação" },
      Body: {
        Html: {
          Data: `
            <h1>Código de verificação</h1>
            <p>Seu código é: <strong>${otp}</strong></p>
          `,
        },
      },
    },
  };

  const sesClient = new SESClient({ region: "us-east-1" });
  await sesClient.send(new SendEmailCommand(params));
};
export const validateOTP = async (email: string, otp: string) => {
  const params = {
    TableName: process.env.OTP_TABLE,
    Key: { email },
  };

  const result = await dynamoClient.send(new GetCommand(params));
  if (!result.Item) return false;

  const isValid =
    result.Item.otp === otp &&
    result.Item.expiresAt > Math.floor(Date.now() / 1000);

  return isValid;
};
export const completeAuth = async (session: string) => {
  const params = {
    ClientId: process.env.USER_POOL_CLIENT_ID,
    ChallengeName: ChallengeNameType.CUSTOM_CHALLENGE,
    Session: session,
    ChallengeResponses: {
      ANSWER: "valid",
    },
  };

  const command = new RespondToAuthChallengeCommand(params);
  const response = await cognitoClient.send(command);

  return {
    accessToken: response.AuthenticationResult?.AccessToken,
    refreshToken: response.AuthenticationResult?.RefreshToken,
    idToken: response.AuthenticationResult?.IdToken,
  };
};
