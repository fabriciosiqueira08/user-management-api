import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: process.env.AWS_REGION });

export const getSecret = async (secretName: string): Promise<string> => {
  const command = new GetSecretValueCommand({
    SecretId: `${process.env.SERVICE_NAME}/${process.env.STAGE}/${secretName}`,
  });

  const response = await client.send(command);
  return response.SecretString || "";
};
